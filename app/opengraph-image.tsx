import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Horizon — Dashboard stratégique vers l'indépendance financière";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F1115",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#F3F4F6",
              marginBottom: 24,
              letterSpacing: "-0.02em",
            }}
          >
            Horizon
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#16A34A",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Prenez le contrôle de votre liberté financière
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#9CA3AF",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Revenus, dépenses, épargne, PEA — un seul dashboard
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
