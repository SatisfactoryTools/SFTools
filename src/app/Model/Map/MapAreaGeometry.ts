export class MapAreaGeometry
{

	/** Even-odd ray casting: a self-crossing outline still has a well-defined inside. */
	public static contains(points: ReadonlyArray<readonly [number, number]>, x: number, y: number): boolean
	{
		let inside = false;
		for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
			const [xi, yi] = points[i];
			const [xj, yj] = points[j];
			if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
				inside = !inside;
			}
		}
		return inside;
	}

}
