import {MapBoundsSchema} from '@src/Model/API/Schema/Map/MapBoundsSchema';
import {MapSchema} from '@src/Model/API/Schema/Map/MapSchema';

/** Image x grows with world X and image y with world Y, both from the image's top-left corner. */
export class MapBackground
{

	public readonly id: string;
	public readonly size: number;
	public readonly tileSize: number;
	public readonly minZoom: number;
	public readonly maxZoom: number;
	public readonly tileUrlTemplate: string;
	public readonly world: MapBoundsSchema;
	/** The shallowest tile: the whole map in one small image. */
	public readonly overviewUrl: string;

	private readonly icons: Record<string, string>;
	private readonly baseUrl: string;

	private readonly minX: number;
	private readonly minY: number;
	private readonly scaleX: number;
	private readonly scaleY: number;

	public constructor(schema: MapSchema, baseUrl: string)
	{
		this.id = schema.id;
		this.size = schema.size;
		this.tileSize = schema.tileSize;
		this.minZoom = schema.minZoom;
		this.maxZoom = schema.maxZoom;
		this.tileUrlTemplate = `${baseUrl}/tiles/{z}/{x}/{y}.${schema.format}`;
		this.world = schema.world;
		this.overviewUrl = `${baseUrl}/tiles/${schema.minZoom}/0/0.${schema.format}`;
		this.icons = schema.icons ?? {};
		this.baseUrl = baseUrl;
		this.minX = schema.world.minX;
		this.minY = schema.world.minY;
		this.scaleX = schema.size / (schema.world.maxX - schema.world.minX);
		this.scaleY = schema.size / (schema.world.maxY - schema.world.minY);
	}

	public iconUrl(key: string | null): string | null
	{
		const path = key === null ? undefined : this.icons[key];
		return path === undefined ? null : `${this.baseUrl}/${path}`;
	}

	public worldToImage(x: number, y: number): [number, number]
	{
		return [(x - this.minX) * this.scaleX, (y - this.minY) * this.scaleY];
	}

	public imageToWorld(px: number, py: number): [number, number]
	{
		return [px / this.scaleX + this.minX, py / this.scaleY + this.minY];
	}

}
