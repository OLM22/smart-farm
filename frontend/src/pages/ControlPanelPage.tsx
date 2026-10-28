import React, { useState } from "react";
import PageTemplate from "../templates/PageTemplate2";
import BatchSelector from "../components/BatchSelector";
import LightControl from "../components/LightControl";
import PhControl from "../components/PhControl";
import GasControl from "../components/GasControl";
import WaterControl from "../components/WaterControl";
import MqttSensorValues from "../components/MqttSensorValues";

const ControlPanelPage: React.FC = () => {
  const [batchValue, setBatchValue] = useState<number>(1);

  return (
    <PageTemplate title="Control Panel" showDeviceSelector={false}>
      {/* Top Section: Video & Live Sensor Values */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-4 items-center">
        {/* Video Monitor (Left) */}
        <div className="xl:col-span-1 w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-fit self-start">
          <div className="flex items-center justify-center mb-4">
            <h2 className="text-xl font-extrabold text-gray-800">Monitor screen</h2>
          </div>
          <div className="rounded-lg overflow-hidden relative flex-grow flex items-center">
            <video 
              src="/Video/chlorella_tank.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Live Sensor Values (Right) */}
        <div className="xl:col-span-1">
          <MqttSensorValues />
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-stretch">
        <BatchSelector value={batchValue} onChange={setBatchValue} />
        <LightControl />
        <PhControl />
        <GasControl />
        <WaterControl />
      </div>
      <br />
    </PageTemplate>
  );
};

export default ControlPanelPage;