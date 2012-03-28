//helper function
var getRand = function(min, max) {
	return (Math.random() * (max - min)) + min;
}


var captchafy = function(canvas) {
	this.canvas = canvas;
	
	this._text = "";
	this.fontSize = 64;
	this.fontFace = "Times";
	this.padding = 0;
	
	
	var executionChain = [];

	this.init = function(text, fontSize, fontFace, padding) {
		this._text = text;
		this.fontSize = fontSize;
		if (fontFace) {
			this.fontFace = fontFace;
		}
		this.padding = padding;
		this.adjustSize();
		return this;
	}
	
	this.saveContext = function() {}
	this.restoreContext = function() {}
	
	
	this.add = function(ex, options) {
		var ctx = this.canvas;
		executionChain.push(function() {
			ex(ctx, options);
		});
		return this;
	}
	
	
	this.adjustSize = function() {
		var context = this.canvas.getContext('2d');
		//context.save();
		context.font = this.fontSize + "px " + this.fontFace;
		var textWidth = context.measureText(this._text).width;
		this.canvas.width = (textWidth + (this.padding ? this.padding : 0)) * 2;
		this.canvas.height = (this.fontSize + (this.padding ? this.padding : 0)) * 4;
		//context.restore();
	}
	
	this.render = function() {
		console.log(executionChain);
		executionChain.forEach(function(el, idx, arr) {
			el.call(el);
		});
	}
	
	this.crop = function() {
		var context = this.canvas.getContext('2d');
		var imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		var data = imageData.data;
		
		var maxX = 0
			, maxY = 0
			, minX = this.canvas.width
			, minY = this.canvas.height;
			

		for (var i=0; i<data.length; i+=4) {
        	var alpha = data[i + 3];
        	if (alpha != 0) {
        		//we have image data
        		var x = Math.floor((i/4) % imageData.width) + 1;
        		var y = Math.floor((i/4) / imageData.width) + 1;
        		
        		if (x < minX) { minX = x; }
        		if (x > maxX) { maxX = x; }
        		if (y < minY) { minY = y; }
        		if (y > maxY) { maxY = y; }
        	}
		}
		console.log(minX, maxX, minY, maxY);

		var croppedData = context.getImageData(minX, minY, (maxX-minX), (maxY-minY));
		this.canvas.width = maxX-minX;
		this.canvas.height = maxY-minY;
		
		context.putImageData(croppedData, 0, 0);

	}
}


var ex = {
	"create": function(canvas) {
		return new captchafy(canvas);
	},
	
	"noise": {
		"straightLines": function(canvas, options) {
			var maxY = canvas.height;
			var maxX = canvas.width;
			
			options = options ? options : {};
			var strokeWidth = options.width ? options.width : Math.ceil(maxY*.025);
			var strokeColor = options.color ? options.color : "#000000"
			var numLines = options.count ? options.count : 3;
		
			var context = canvas.getContext('2d');
			context.strokeStyle = strokeColor;
			context.lineWidth = strokeWidth;
			
			for (var i=0; i<numLines; i++) {
				var sy = (maxY/4) + Math.floor(Math.random() * (maxY/2));
				var dy = (maxY/4) + Math.floor(Math.random() * (maxY/2));
				var sx = Math.floor(Math.random() * (maxX/10));
				var dx = maxX - sx;
				//var sy = cy - Math.floor(Math.random() * (maxY/4 - 5));
				//var dy = maxY - sy;
				
				context.beginPath();
				context.moveTo(sx,sy);
				context.lineTo(dx,dy);
				context.closePath();
				context.stroke();
			}
		},
		
		"blob": function(canvas, options) {
			context = canvas.getContext('2d');
		
			var fillStyle = options.fillStyle ? options.fillStyle : "black";
			/*
			var x = options.x
				, y = options.y
				, w = options.w
				, h = options.h;
			*/
			var w = options.w; //canvas.width/5;
			var h = options.h; //canvas.height/4;
		
			var x = (canvas.width/2)-w;
			var y = (canvas.height/2)+(h/2);
		
			context.save();
			context.fillStyle = fillStyle;
		
			context.setTransform(1,0,0,1,0,0);
			context.globalCompositeOperation = "xor";
			//context.lineWidth = 6;
			//context.strokeStyle = "#000";
			context.beginPath();
			context.moveTo(x, y);
			var curvePct = .4;
			var corners = [[x+w, y], [x+w, y-h], [x, y-h], [x,y]];
			for (var i=0; i<corners.length; i++) {
				var corner = corners[i];
				var nextX = corner[0], nextY = corner[1];
				var cp1x = nextX * (getRand((-1*curvePct), curvePct))
					, cp1y = nextX * (getRand((-1*curvePct), curvePct))
					, cp2x = nextX * (getRand((-1*curvePct), curvePct))
					, cp2y = nextX * (getRand((-1*curvePct), curvePct));
				context.bezierCurveTo(nextX-cp1x, nextY-cp1y, nextX-cp2x, nextY-cp2y, nextX, nextY);
			}
			//context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x+w, y);
			//context.bezierCurveTo(7, 490, 488, 7, 493, 490);
			//context.bezierCurveTo(7, 490, 488, 7, 493, 490);
			//context.bezierCurveTo(7, 490, 488, 7, x+w, y+h);
			context.fill(); //.stroke();
			context.restore();
		},

		"snow": function(canvas, options) {
			options = options ? options : {};
			var opacity = options.opacity ? options.opacity : .2;
			var context = canvas.getContext('2d');
			
			for ( x = 0; x < canvas.width; x+=10 ) {  
				for ( y = 0; y < canvas.height; y+=10 ) {  
					var number = Math.floor( Math.random() * 60 );  
					context.fillStyle = "rgba(" + number + "," + number + "," + number + "," + opacity + ")";  
					context.fillRect(x, y, 5, 5);  
				}
			}
		}
	
	},
	
	"gimp": {
		"shadow": function(canvas, options, fn) {
			options = options ? options : {};
			var x = options.x ? options.x : 5;
			var y = options.x ? options.y : 5;
			var color = options.color ? options.color : "rgba(0,0,0,.25)";
		
			var context = canvas.getContext('2d');
		
			//context.save();
			context.shadowOffsetX = x;
			context.shadowOffsetY = y;
			context.shadowColor = color;
			
			
			//fn(context, options);
			if (fn) {
				fn.call(context);
			}
			//context.restore();
		}
	},
	
	"text": {
		"basic": function(canvas, options, cb) {
			var context = canvas.getContext('2d');
			console.log(arguments);
			options = options ? options : {};
			var text = options.text ? options.text : "";
			var fontSize = options.size ? options.size : 64;
			var fontFace = options.font ? options.font : "Times";
			var fillStyle = options.fillStyle ? options.fillStyle : "black";
		
		
			context.save();
		
			context.font = fontSize + "px " + fontFace;
			context.fillStyle = fillStyle;
			
			//context.textAlign = "center";
		
			//console.log("Writing " + text);
		
			context.textAlign = "left";
			context.textBaseline = "middle";
			
			//FIXME: hack to adjust for descenders
			context.translate(canvas.width/2, canvas.height/2);
			//fontSize-(.2*fontSize));
			context.fillText(text, 0, 0);
			
			
			
			if (cb) { cb(context); }
			context.restore();
		},
		"wavy": function(canvas, options, cb) {
			var context = canvas.getContext('2d');
			console.log(arguments);
			options = options ? options : {};
			var text = options.text ? options.text : "";
			var fontSize = options.size ? options.size : 64;
			var fontFace = options.font ? options.font : "Times";
			var fillStyle = options.fillStyle ? options.fillStyle : "black";
		
		
			context.save();
		
			context.font = fontSize + "px " + fontFace;
			context.fillStyle = fillStyle;
			
			//context.textAlign = "center";
		
			//console.log("Writing " + text);
		
			context.textAlign = "left";
			context.textBaseline = "middle";
			
			//FIXME: hack to adjust for descenders
			//context.translate(canvas.width/2, canvas.height/2);
			//fontSize-(.2*fontSize));
			//context.fillText(text, canvas.width/2, canvas.height/2);
			
			context.translate(10, canvas.height/2); 
			
			for (var x = 0; x < text.length; x++)
			{
				context.save();
				var c = text.charAt(x);
				var metrics = context.measureText(c);
				var w = metrics.width;
			
				context.transform (1, getRand(-.5,.5), getRand(-.5,.5), 1, 0, 0);
				context.fillText (c, 0, 0) ;
			
				context.restore();
				//context.setTransform (1, 0, 0, 1, 0, 0);
				context.translate(w, 0);
			}
			
			
			
			if (cb) { cb(context); }
			context.restore();
		}
	}
	
}

module.exports = ex;