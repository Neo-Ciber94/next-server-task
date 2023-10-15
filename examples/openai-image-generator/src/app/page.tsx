import GenerateImageInput from "./GenerateImageInput";

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="font-bold mb-2 text-3xl sm:text-4xl font-mono">
        Image Generator
      </h1>
      <GenerateImageInput />
    </div>
  );
}
