import Link from "next/link";
export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h1>Chatter Quiz</h1>
      <ul>
        <li><Link href="/q/demo?source=local">Open the Demo</Link></li>
        <li><Link href="/q/island-prepositions?source=local">Island Prepositions</Link></li>
      </ul>
    </main>
  );
}