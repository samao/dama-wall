import Action, { Type } from "../actions";
import { view } from "../states";

//当前view页面
export default function views(state: number = view, action: Action): number {
	switch (action.type) {
		case Type.LINK_TO:
			return action.view;
	}
	return state;
}
