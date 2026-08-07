import { ReactNode } from "react";
import { TOPNAV_HEIGHT } from "./TopNav";

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-0)",
        paddingTop: `calc(${TOPNAV_HEIGHT}px + var(--space-4))`,
        paddingRight: "var(--space-4)",
        paddingBottom: "var(--space-4)",
        paddingLeft: "var(--space-4)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
