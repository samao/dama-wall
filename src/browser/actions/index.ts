/*
 * @Author: iDzeir 
 * @Date: 2018-01-04 10:20:56 
 * @Last Modified by:   iDzeir 
 * @Last Modified time: 2018-01-04 10:20:56 
 */

 import { RoomData } from "../states/rooms";

export enum Type {
	Router = "linkTo",
	ROOM_READY = "roomReady",
	CREATE_ACT = "createAct",
	CREATE_ACT_FAIL = "createActFail",
	CREATE_ACT_SUCCESS = "createActSuccess",
	ACT_DELETED = "actDeleted"
}

export default interface Action {
	type: string;
	[index: string]: any;
};

export function linkTo(view: number): Action {
	return {
		type: Type.Router,
		view
	};
}

export function roomReady(data: RoomData[]): Action {
	return {
		type: Type.ROOM_READY,
		data
	};
}

export const act = {
	create: {
		type: Type.CREATE_ACT
	},
	fail: {
		type: Type.CREATE_ACT_FAIL
	},
	success: {
		type: Type.CREATE_ACT_SUCCESS
	},
	delete: (rid: string) => ({
		type: Type.ACT_DELETED,
		rid
	})
};
