"use client";

import Image from "next/image";

type LogoWordmarkProps = {
  className?: string;
  priority?: boolean;
};

const LogoWordmark = ({ className = "", priority = false }: LogoWordmarkProps) => {
  return (
    <Image
      src="/twdlogo.png"
      alt="App logo"
      width={180}
      height={52}
      priority={priority}
      className={`h-auto w-auto ${className}`.trim()}
    />
  );
};

export default LogoWordmark;

