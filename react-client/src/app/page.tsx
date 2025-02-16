import { Button } from "./components/button";
import { TextInput } from "./components/textInput";

export default function Home() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <h1 className="text-2xl font-bold">Welcome to pictionary</h1>
      <TextInput placeholder="Enter your name"></TextInput>
      <Button title="Let's play"></Button>

      <Button title="Join Lobby"></Button>
      <Button title="Create Lobby"></Button>
      <Button title="Disconnect"></Button>
    </div>
  );
}
