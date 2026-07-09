"use client";
import gsap from "gsap";
import React, { useLayoutEffect, useRef } from "react";
import "./diamond-loader.css";

export const DiamondLoader: React.FC = () => {
  const diamondRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!diamondRef.current || !shadowRef.current) return;

    const timeline = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: {
        duration: 0.7,
        ease: "sine.inOut",
      },
    });

    timeline.to(diamondRef.current, { y: 20 }, 0);
    timeline.to(
      shadowRef.current,
      {
        scaleX: 1.3,
        scaleY: 0.7,
        filter: "blur(3px)",
      },
      0,
    );

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <div className="relative flex h-[100px] w-[100px] flex-col items-center">
      <div ref={diamondRef} className="diamond-loader" />
      <div ref={shadowRef} className="diamond-loader-shadow" />
    </div>
  );
};
