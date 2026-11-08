import Pricing from "./Pricing";
import "./landing.css";

export default function Ended({ email, foundingLeft, notice }: { email: string; foundingLeft: number | null; notice?: string }) {
  return (
    <div className="lp">
      <header className="lp-nav"><span className="brand">Evee <span>Studio</span></span>
        <form method="post" action="/auth/signout"><button className="lp-signin" style={{ font: "inherit", cursor: "pointer" }}>Sign out</button></form></header>
      <main>
        <section className="lp-center">
          <h1 style={{ fontSize: 34 }}>Your subscription has ended</h1>
          <p className="lp-sub">Your sales history and products are saved. Pick a plan to pick up right where you left off.</p>
          <p className="lp-fine">Signed in as {email}</p>
        </section>
        <Pricing foundingLeft={foundingLeft} notice={notice} email={email} />
      </main>
    </div>
  );
}
