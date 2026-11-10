import "./landing.css";

export const CONTACT = "hello@heyevee.com";
export const UPDATED = "November 10, 2026";

export default function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp">
      <header className="lp-nav"><a href="/" className="brand">Evee <span>Studio</span></a><nav><a href="/terms" className="lp-navlink">Terms</a><a href="/privacy" className="lp-navlink">Privacy</a><a href="/" className="lp-signin">Home</a></nav></header>
      <main><article className="lp-legal"><h1>{title}</h1><p className="lp-fine">Last updated {UPDATED}</p>{children}</article></main>
      <footer className="lp-foot"><span>Evee Studio is part of the <a href="https://heyevee.com">Hey Evee</a> family.</span><span>© {new Date().getFullYear()} Elevation Haus LLC</span></footer>
    </div>
  );
}
