export const SpecialClasses = {
	PowerUsage: '__special_power_usage',
	PowerProduction: '__special_power_production',
	Machines: '__special_machines',
	Sloops: '__special_sloops',
	/** Pseudo-item class used in production requests to demand power in MW. */
	PowerTarget: '__power_target',
	/** Pseudo-item class used in production requests to demand AWESOME Sink points per minute. */
	SinkPointsTarget: '__sink_points_target',
	/** Water is effectively unlimited (extractors need no node) - world limits never apply to it. */
	WaterItem: 'Desc_Water_C',
	/** Real game item classes whose icons stand in for build-cost quantities. */
	PowerShardItem: 'Desc_CrystalShard_C',
	SomersloopItem: 'Desc_WAT1_C',
	SinkCouponItem: 'Desc_ResourceSinkCoupon_C',
}
