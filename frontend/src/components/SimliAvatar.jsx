import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    useState,
} from "react";
import { SimliClient, generateSimliSessionToken, generateIceServers } from "simli-client";
import styles from "./SimliAvatar.module.css";

const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY || "";
const SIMLI_FACE_ID = import.meta.env.VITE_SIMLI_FACE_ID || "";

/**
 * SimliAvatar — lazy-reconnect, generation-guarded, prefetch-aware
 *
 * Pass `prefetchedSession={{ session_token, iceServers }}` (fetched during
 * the setup page) to skip the ~1-2 s API round-trip on first connect.
 */
const SimliAvatar = forwardRef(function SimliAvatar({ prefetchedSession }, ref) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const clientRef = useRef(null);
    const statusRef = useRef("idle");   // idle | connecting | ready | error
    const pendingPCM = useRef([]);
    const generationRef = useRef(0);     // bumped on every unmount to cancel stale async
    const isConnecting = useRef(false);
    const connectPromiseRef = useRef(null);
    const cooldownUntilRef = useRef(0);
    const doConnectRef = useRef(null);   // set inside useEffect; used by sendPCM for lazy reconnect
    const prefetchConsumed = useRef(false); // pre-fetched token used once then discarded

    const [status, setStatus] = useState("connecting");

    const setLiveStatus = (s) => {
        statusRef.current = s;
        setStatus(s);
    };

    /* ── Expose sendPCM + isReady to parent ── */
    useImperativeHandle(ref, () => ({
        /** true when Simli has an active session ready for audio */
        isReady() {
            return statusRef.current === "ready";
        },
        sendPCM(uint8Array) {
            const s = statusRef.current;
            if (s === "ready" && clientRef.current) {
                clientRef.current.sendAudioData(uint8Array);
            } else {
                pendingPCM.current.push(uint8Array);
                if (Date.now() >= cooldownUntilRef.current && s !== "connecting") {
                    doConnectRef.current();
                }
            }
        },
    }));

    /* ── Initial connect on mount ── */
    useEffect(() => {
        if (!SIMLI_API_KEY || !SIMLI_FACE_ID) {
            console.warn("SimliAvatar: Set VITE_SIMLI_API_KEY & VITE_SIMLI_FACE_ID in .env");
            setLiveStatus("error");
            return;
        }

        // Each mount gets a unique generation ID.
        // When StrictMode unmounts → remounts, the cleanup bumps the counter
        // so any in-flight async from the FIRST mount sees it's stale and aborts.
        const myGen = ++generationRef.current;

        const connect = async () => {
            if (generationRef.current !== myGen || isConnecting.current) return;
            if (Date.now() < cooldownUntilRef.current) return;

            if (connectPromiseRef.current) {
                await connectPromiseRef.current;
                return;
            }

            isConnecting.current = true;
            const run = (async () => {
                try { clientRef.current?.close(); } catch { }
                clientRef.current = null;
                setLiveStatus("connecting");

                try {
                    // Use pre-fetched credentials ONLY on the very first connect.
                    // After `stop`, reconnects must fetch a fresh token — the old one is spent.
                    let sessionToken, iceServerList;
                    if (!prefetchConsumed.current && prefetchedSession?.session_token && prefetchedSession?.iceServers) {
                        sessionToken = prefetchedSession.session_token;
                        iceServerList = prefetchedSession.iceServers;
                        prefetchConsumed.current = true;  // consume — never reuse this token
                    } else {
                        const [tokenResp, iceServers] = await Promise.all([
                            generateSimliSessionToken({
                                apiKey: SIMLI_API_KEY,
                                config: { faceId: SIMLI_FACE_ID, maxSessionLength: 600, maxIdleTime: 300 },
                            }),
                            generateIceServers(SIMLI_API_KEY),
                        ]);
                        sessionToken = tokenResp.session_token;
                        iceServerList = iceServers;
                    }

                    // Check again after the await — StrictMode may have unmounted us
                    if (generationRef.current !== myGen) { isConnecting.current = false; return; }

                    const client = new SimliClient(
                        sessionToken,
                        videoRef.current,
                        audioRef.current,
                        iceServerList,
                    );
                    clientRef.current = client;

                    client.on("start", () => {
                        if (generationRef.current !== myGen) return;
                        isConnecting.current = false;
                        cooldownUntilRef.current = 0;
                        setLiveStatus("ready");
                        const chunks = pendingPCM.current.splice(0);
                        for (const chunk of chunks) {
                            try {
                                client.sendAudioData(chunk);
                            } catch (sendErr) {
                                console.error("Simli sendAudioData failed:", sendErr);
                            }
                        }
                    });

                    client.on("stop", () => {
                        isConnecting.current = false;
                        if (generationRef.current === myGen) setLiveStatus("idle");
                    });

                    client.on("startup_error", (msg) => {
                        console.error("Simli startup_error:", msg);
                        isConnecting.current = false;
                        const text = String(msg || "");
                        if (/RATE LIMIT|Too Many Retry|Too Many/i.test(text)) {
                            cooldownUntilRef.current = Date.now() + 20_000;
                            pendingPCM.current = [];
                        }
                        if (generationRef.current === myGen) setLiveStatus("error");
                    });

                    client.on("error", (msg) => {
                        console.error("Simli error:", msg);
                        isConnecting.current = false;
                        const text = String(msg || "");
                        if (/RATE LIMIT|Too Many Retry|Too Many/i.test(text)) {
                            cooldownUntilRef.current = Date.now() + 20_000;
                            pendingPCM.current = [];
                        }
                        if (generationRef.current === myGen) setLiveStatus("idle");
                    });

                    await client.start();
                } catch (err) {
                    console.error("SimliAvatar connect error:", err);
                    isConnecting.current = false;
                    if (/Too Many Retry|Too Many/i.test(String(err?.message || ""))) {
                        cooldownUntilRef.current = Date.now() + 20_000;
                        pendingPCM.current = [];
                    }
                    if (generationRef.current === myGen) setLiveStatus("idle");
                } finally {
                    connectPromiseRef.current = null;
                }
            })();

            connectPromiseRef.current = run;
            await run;
        };

        // Store connect so sendPCM can trigger it lazily
        doConnectRef.current = connect;

        return () => {
            // Bump generation → invalidates all in-flight async from this mount
            generationRef.current++;
            isConnecting.current = false;
            cooldownUntilRef.current = 0;
            pendingPCM.current = [];
            try { clientRef.current?.close(); } catch { }
            clientRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    /* ── Render ── */
    const showSpinner = status === "connecting";
    const showError = status === "error";

    return (
        <div className={styles.avatarCard}>
            <div className={styles.videoWrap}>
                <video ref={videoRef} className={styles.avatarVideo} autoPlay playsInline />
                {/* Simli handles both audio + video in sync via WebRTC */}
                <audio ref={audioRef} autoPlay style={{ display: "none" }} />

                {showSpinner && (
                    <div className={styles.statusOverlay}>
                        <div className={styles.spinner} />
                        <span>Connecting avatar…</span>
                    </div>
                )}
                {showError && (
                    <div className={styles.statusOverlay}>
                        <span className={styles.errorIcon}>⚠️</span>
                        <span>Avatar unavailable</span>
                    </div>
                )}
            </div>

            <div className={styles.avatarLabel}>
                <span className={`${styles.dot} ${status === "ready" ? styles.dotReady : ""}`} />
                AI Interviewer
            </div>
        </div>
    );
});

export default SimliAvatar;
