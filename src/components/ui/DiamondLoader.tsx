import React from "react";
import "./diamond-loader.css";

export const DiamondLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center relative w-[100px] h-[100px]">
      <div className="diamond-loader"></div>
      <div className="diamond-loader-shadow"></div>
    </div>
  );
};
