import type { Metadata } from "next";
import { ChatScreen } from "@/components/v2/chat/ChatScreen";

export const metadata: Metadata = { title: "Conversación — Frontera 2.0" };

export default function Page() {
  return <ChatScreen />;
}
