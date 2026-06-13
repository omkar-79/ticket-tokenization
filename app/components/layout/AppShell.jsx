import MobileTabBar from "../nav/MobileTabBar.jsx";

export default function AppShell({ children }) {
  return (
    <>
      <div className="relative z-10 max-w-3xl mx-auto px-[var(--page-x)] pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+1.5rem)] md:pb-16">
        {children}
      </div>
      <MobileTabBar />
    </>
  );
}
