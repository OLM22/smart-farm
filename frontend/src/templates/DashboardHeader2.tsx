import React from "react";
import TimeDisplay from "./headers/TimeDisplay";
import ProfileMenu from "./headers/UserIcon";
import NotificationIcon from "./headers/NotificationIcon";

const DashboardHeader: React.FC = () => {
  return (
    <div className="backdrop-blur-md bg-white/70 border border-white/40 w-full px-6 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] rounded-2xl">
      <div className="flex flex-row items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Kasetsart University Smart Farm Logo"
            className="h-8 sm:h-10 md:h-12 w-auto transition-all duration-300"
          />
          <div className="hidden lg:block text-sm text-gray-600 leading-tight">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
              AIoT Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
              Real-time Monitoring System
            </p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <TimeDisplay />
          </div>
          <NotificationIcon />
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
