
import { useEffect, useState } from "react";

const DOWNLOAD_URL =
  "https://github.com/gcvdesignsecure/bliss-academy/releases/latest/download/BLISS-Academy.apk";

const RELEASE_API =
  "https://api.github.com/repos/gcvdesignsecure/bliss-academy/releases/latest";

type Release = {
  tag_name?: string;
};

export default function AppUpdateNotice() {
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentVersion = Number(
      import.meta.env.VITE_APP_BUILD_NUMBER || "0"
    );

    if (!currentVersion) return;

    let cancelled = false;

    async function checkUpdate() {
      try {
        const response = await fetch(RELEASE_API, {
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) return;

        const release = (await response.json()) as Release;

        const match = release.tag_name?.match(/^apk-(\d+)$/);

        if (!match) return;

        const remoteVersion = Number(match[1]);

        if (!cancelled && remoteVersion > currentVersion) {
          setLatestVersion(remoteVersion);
        }
      } catch {
        // Update checking must not prevent BLISS Academy from opening.
      }
    }

    void checkUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  if (latestVersion === null || dismissed) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#fff7ed",
        color: "#7c2d12",
        borderBottom: "1px solid #fed7aa",
        padding: "12px",
      }}
    >
      <strong>BLISS Academy update available</strong>

      <p style={{ margin: "6px 0" }}>
        Version {latestVersion} is ready to install.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <a
          href={DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#c2410c",
            color: "#ffffff",
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Download update
        </a>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: "#ffffff",
            color: "#7c2d12",
            border: "1px solid #fdba74",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
