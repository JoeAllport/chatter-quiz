import { redirect } from "next/navigation";
export default function Home() {
  redirect("/q/demo?source=local");
}
