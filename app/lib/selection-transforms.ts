import { connectorKinds, type CanvasObject, type Point } from "./canvas-types";

const scaledPoint = (point: Point, anchor: Point, scaleX: number, scaleY: number): Point => ({
  x: anchor.x + (point.x - anchor.x) * scaleX,
  y: anchor.y + (point.y - anchor.y) * scaleY,
});

/** Scales an object's real geometry around a shared anchor, preserving a multi-object layout. */
export function scaleObjectFromAnchor(object: CanvasObject, anchor: Point, scaleX: number, scaleY: number): CanvasObject {
  const origin = scaledPoint({ x: object.x, y: object.y }, anchor, scaleX, scaleY);
  const next: CanvasObject = {
    ...object,
    x: origin.x,
    y: origin.y,
    width: object.width === undefined ? undefined : object.width * scaleX,
    height: object.height === undefined ? undefined : object.height * scaleY,
    points: object.points?.map((point) => scaledPoint(point, anchor, scaleX, scaleY)),
    control: object.control ? scaledPoint(object.control, anchor, scaleX, scaleY) : undefined,
  };
  if (connectorKinds.includes(object.kind) || object.x2 !== undefined || object.y2 !== undefined) {
    const endpoint = scaledPoint({ x: object.x2 ?? object.x, y: object.y2 ?? object.y }, anchor, scaleX, scaleY);
    next.x2 = endpoint.x;
    next.y2 = endpoint.y;
  }
  if (object.kind === "text") {
    const fontScale = Math.sqrt(Math.abs(scaleX * scaleY));
    next.style = { ...object.style, fontSize: Math.max(8, (object.style?.fontSize ?? 17) * fontScale) };
  }
  return next;
}

/** Keeps an existing multi-selection intact when one of its members starts a drag. */
export function selectionAfterPick(current: string[], targetId: string, groupIds: string[], additive: boolean): string[] {
  if (!additive && current.includes(targetId)) return current;
  if (!additive) return groupIds;
  if (current.includes(targetId)) return current.filter((id) => !groupIds.includes(id));
  return [...new Set([...current, ...groupIds])];
}
