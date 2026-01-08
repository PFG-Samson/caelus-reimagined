declare module "leaflet-velocity" {
  import * as L from "leaflet";

  export interface VelocityLayerOptions extends L.LayerOptions {
    displayValues?: boolean;
    displayOptions?: {
      velocityType?: string;
      displayPosition?: string;
      displayEmptyString?: string;
      speedUnit?: string;
      angleConvention?: string;
    };
    data?: any;
  }

  export function velocityLayer(options: VelocityLayerOptions): L.Layer;
}
