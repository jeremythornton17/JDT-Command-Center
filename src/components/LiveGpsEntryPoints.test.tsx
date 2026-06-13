import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import EquipmentBoard from "./EquipmentBoard";
import FreightBoard from "./FreightBoard";

describe("Live GPS map entry points", () => {
  it("shows an Open Live Map action on the Freight page", () => {
    const html = renderToString(
      <FreightBoard
        loads={[]}
        equipment={[]}
        workOrders={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
        onOpenLiveMap={() => undefined}
      />,
    );

    assert.match(html, /Open Live Map/);
  });

  it("shows Open Live Map and Track Asset actions on tracked equipment", () => {
    const html = renderToString(
      <EquipmentBoard
        starterEquipment={[{
          id: "equipment-semi-1",
          name: "Semi #1",
          category: "Truck",
          revealVehicleId: "veh-1",
          lastTelematicsLatitude: 26.387315,
          lastTelematicsLongitude: -80.171258,
        }]}
        fleetTelematicsEvents={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
        onOpenLiveMap={() => undefined}
      />,
    );

    assert.match(html, /Open Live Map/);
    assert.match(html, /Track Asset/);
  });
});
