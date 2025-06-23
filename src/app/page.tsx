import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        background: "#C8EDF7", // Changed background color
      }}
    >
      {/* Background image with overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Image
          src="/backgrounds/landing-bg.jpg"
          alt="PSU Building"
          fill
          style={{
            objectFit: "cover",
            objectPosition: "center bottom",
            filter: "brightness(1) blur(0.5px)",
          }}
          priority
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
          }}
        />
      </div>

      {/* Foreground content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "100vh",
          paddingTop: 60,
        }}
      >
        {/* Logo and GrandPass */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <img
            src="/backgrounds/passlogo.png"
            alt="GrandPass Logo"
            style={{ width: 90, height: 90 }}
          />
          <span style={{ fontWeight: 700, fontSize: 48, color: "#2d5fff" }}>GrandPass</span>
        </div>
        {/* Welcome Headline */}
        <h1 style={{ fontWeight: 700, fontSize: 48, margin: "0 0 32px 0", textAlign: "center" }}>
          <span style={{ color: "#2d5fff" }}>Welcome to</span>{" "}
          <span style={{ color: "#333" }}>GrandPass</span>
        </h1>
        {/* Set a Visit Button */}
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Link
            href="/registration"
            className="btn btn-primary btn-lg px-5 py-3 mt-4 shadow"
            style={{
              background: "#2d5fff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "18px 64px",
              fontSize: 24,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "background 0.2s",
              textDecoration: "none",
              display: "inline-block",
              textAlign: "center",
              lineHeight: 1,
              marginTop: "32px",
            }}
          >
            Set a Visit
          </Link>
        </div>
      </div>
    </div>
  );
}
