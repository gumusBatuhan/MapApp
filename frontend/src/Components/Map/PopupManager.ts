import Overlay from "ol/Overlay";
import type Map from "ol/Map";
import type { Coordinate } from "ol/coordinate";

export class PopupManager {
  private overlay: Overlay;

  constructor(map: Map, element: HTMLElement) {
    this.overlay = new Overlay({
      element,
      autoPan: { animation: { duration: 200 } },
      positioning: "bottom-center",
      stopEvent: true,
      offset: [0, -8],
    });
    map.addOverlay(this.overlay);
  }

  setPosition(coord?: Coordinate) {
    this.overlay.setPosition(coord);
  }

  dispose(map: Map) {
    map.removeOverlay(this.overlay);
  }
}
