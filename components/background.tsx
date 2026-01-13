import { GrainGradient } from "@paper-design/shaders-react";

export function Background() {
  return (
    <GrainGradient
      width="100dvw"
      height="100dvh"
      colors={["#3e6274", "#a49c74", "#568b50"]}
      colorBack="#0e0d16"
      softness={0}
      intensity={0.15}
      noise={0.3}
      shape="blob"
      speed={1}
      scale={1.3}
    />
  );
}
