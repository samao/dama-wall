/**
 * ===================================
 * Author:	iDzeir					
 * Email:	qiyanlong@wozine.com	
 * Company:	http://www.youtv.tv		
 * Created:	Dec 4, 2017 3:00:05 PM
 * ===================================
 */

package com.idzeir.ui.screen
{
	import com.idzeir.components.v2.Image;
	import com.idzeir.components.v2.Style;
	import com.idzeir.components.v2.UIContainer;
	import com.idzeir.manager.ContextType;
	import com.idzeir.manager.emotion.api.IEmotion;
	import com.idzeir.manager.emotion.impl.DanmuPart;
	import com.idzeir.ui.utils.DrawUtil;
	import com.idzeir.ui.utils.FilterUtil;
	
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.text.TextField;
	import flash.text.TextFormat;
	import flash.text.engine.BreakOpportunity;
	import flash.text.engine.ContentElement;
	import flash.text.engine.ElementFormat;
	import flash.text.engine.FontDescription;
	import flash.text.engine.FontWeight;
	import flash.text.engine.GraphicElement;
	import flash.text.engine.GroupElement;
	import flash.text.engine.TextBaseline;
	import flash.text.engine.TextBlock;
	import flash.text.engine.TextElement;
	import flash.text.engine.TextLine;
	
	public class DanmuElement extends UIContainer
	{
		private static const ALL_MAP:Vector.<DanmuElement> = new Vector.<DanmuElement>(); 
		
		private var _text:TextField = new TextField();
		
		private var _textBlock:TextBlock;
		
		private var _color:uint = 0xFFFFFF;
		
		/**
		 * 弹幕显示对象
		 * @param size 弹幕字号
		 */		
		public function DanmuElement(size:uint)
		{
			super();
			_text.autoSize = 'left';
			_text.defaultTextFormat = new TextFormat(Style.font, size, null, true);
			
			_textBlock = new TextBlock();
			_textBlock.baselineFontSize = Number(size);
			_textBlock.baselineZero = TextBaseline.IDEOGRAPHIC_CENTER;
		}
		
		/**
		 * 静态工厂创建弹幕元素 配合recyleDanmu 
		 * 实现弹幕池，回收重用 
		 * @param msg 弹幕内容
		 * @param size 弹幕字号
		 * @return 
		 */		
		public static function createDanmu(msg:Object,size:uint = 60):DanmuElement
		{
			var danmu:DanmuElement
			if(ALL_MAP.length>0)
				danmu =  ALL_MAP.shift();
			else
				danmu = new DanmuElement(size);
			
			danmu.text = msg;
			
			return danmu;
		}
		
		/**
		 * 当前弹幕颜色
		 */		
		public function get color():Number
		{
			return _color;
		}
		
		/**
		 * 设置弹幕显示内容，textField 或者 图文混排
		 * @param value
		 */		
		public function set text(value:Object):void
		{
			_color = value.color;
			const emotion:IEmotion = $(ContextType.EMOTION) as IEmotion;
			const pieces:Vector.<DanmuPart> = emotion.split(value.message);
			
			if(pieces.length == 1 && pieces[0].type === DanmuPart.TEXT)
			{
				//普通弹幕渲染
				_text.text = value.message;
				_text.textColor = Number(value.color);
				addChild(_text);
				setSize(_text.width, _text.height);
			}else{
				//创建图文混排富文本渲染
				_textBlock.content = createGroup(pieces);
				const line:TextLine = _textBlock.createTextLine();
				addChild(line);
				//矫正图文混排位置
				line.y = line.totalAscent;
				setSize(line.width, line.totalHeight);
			}
			FilterUtil.danmu(this);
		}
		
		/**
		 * 弹幕数据解析成TEF 图文数据
		 * @param pieces
		 * @return
		 */
		private function createGroup(pieces:Vector.<DanmuPart>):GroupElement
		{
			var map:Vector.<ContentElement> = new Vector.<ContentElement>();
			var elf:ElementFormat = new ElementFormat(null, Number(_text.defaultTextFormat.size), _color);
			elf.fontDescription = new FontDescription(Style.font, FontWeight.BOLD);
			elf.breakOpportunity = BreakOpportunity.ANY;
			elf.alignmentBaseline = TextBaseline.IDEOGRAPHIC_CENTER;
			elf.dominantBaseline = TextBaseline.IDEOGRAPHIC_CENTER;
			pieces.forEach(function(e:DanmuPart, index:int, arr:Vector.<DanmuPart>):void
			{
				if(e.type === DanmuPart.IMAGE)
				{
					var image:Image = new Image(e.data);
					image.setSize(26, 26);
					var eBox:UIContainer = createAlphaLayer(32, 32, image);
					map.push(new GraphicElement(eBox, eBox.width, eBox.height, elf));
				}else{
					map.push(new TextElement(e.data, elf));
				}
			});
			return new GroupElement(map, elf);
		}
		
		private function createAlphaLayer(w:Number, h:Number, image:Image):UIContainer
		{
			var layer:UIContainer = new UIContainer();
			var bg:Shape = DrawUtil.drawRectRound(w, h, 0, 0);
			bg.alpha = 0;
			layer.addChild(bg);
			layer.setSize(w,h);
			image.move(w - image.width >> 1, h - image.height >> 1);
			layer.addChild(image);
			return layer;
		}
		
		override public function set x(value:Number):void
		{
			super.x = Math.round(value);
		}
		
		/**
		 * 弹幕显示对象回收
		 * @param danmu
		 */		
		public static function recyleDanmu(danmu:DanmuElement):void
		{
			danmu.removeFromParent();
			danmu.removeChildren();
			danmu.filters = [];
			ALL_MAP.push(danmu);
		}
	}
}
