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
	this.textWidth = 0;
	
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
		this.textWidth = textWidth;
		this.canvas.width = (textWidth + (this.padding ? this.padding : 0)) * 2;
		this.canvas.height = (this.fontSize + (this.padding ? this.padding : 0)) * 4;
		//context.restore();
	}
	
	this.render = function() {
		//console.log(executionChain);
		executionChain.forEach(function(el, idx, arr) {
			el.call(el);
		});
	}
	this.toDataURL = function() {
		return this.canvas.toDataURL();
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
	
	"captchafyText": function(_jQuery, _el, callback) {

		var getTextNodesIn = function(el) {
			var whitespace = /^\s*$/;
			return _jQuery(el).find("*").andSelf().contents().filter(function() {
				return (this.nodeType == 3) && !whitespace.test(this.nodeValue);
			});
		};
		
		var toColorString = function(rgbString) {
			var parts = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
			// parts now should be ["rgb(0, 70, 255", "0", "70", "255"]

			delete (parts[0]);
			for (var i = 1; i <= 3; ++i) {
				parts[i] = parseInt(parts[i]).toString(16);
				if (parts[i].length == 1) parts[i] = '0' + parts[i];
			} 
			return "#" + parts.join('').toUpperCase(); // "#0070FF"
		}
		
		try {	
			getTextNodesIn(_el).each(function() {

				var fontSize = parseInt(_jQuery(this.parentNode).css("font-size"));
				var text = this.nodeValue;

				if (!!text && !!fontSize && (_jQuery(this.parentNode).is(':visible'))) {
					var color = toColorString(_jQuery(this.parentNode).css("color"));
					//TODO: implement
					var fontface = "Times";
					try {
						fontface = _jQuery(this.parentNode).css("font-family").split(',')[0];
					}
					catch(errrrrrrrrrr) {}
					
					var words = text.split(' ');
					var replacements = [];
					
					var cnvs = document.createElement("canvas");
					document.body.appendChild(cnvs);
					
					for (var i=0; i<words.length; i++) {
						var word = words[i];
						if (!word) { continue; }
						//let's just do every other word
						if (words.length > 1 && i%2==0) {
							replacements.push("<span>" + word + "</span>");
							continue;
						}

						try {
						

							var captcha = ex.create(cnvs);
			
			
							captcha.init(word, fontSize, fontface); //, 300);
			
							captcha
								.add(ex.text.wavy, {"text": word, "size": fontSize, "fillStyle": color, "font": fontface })
								.add(ex.noise.blob, {"fillStyle": color, "h": fontSize, "w": (fontSize * 1.5)})
								.render();
			
							captcha.crop();

							//replacements.push('<img src="' + captcha.toDataURL() + '" /> ');
							
							replacements.push('<span style="display:inline-block;width:' + captcha.canvas.width + 'px;height:' + captcha.canvas.height + 'px;background-image:url(\'' + captcha.toDataURL() + '\')"></span>');
							
						}
						catch(err) {
							//console.log("Error generating captcha for " + word + " [" + fontSize + "]");
							console.log(err.message);
							console.log(err);
						}
					}


					_jQuery(this).replaceWith(replacements.join(' '));
					
										
					document.body.removeChild(cnvs);
				}
				
			}); //end .each()

			callback();
		}
		catch(e) {
			console.log(e);
			//throw e;
		}

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
			var adjust = function (start, amt) {
				if (!amt) { amt = 0.2; }
				var negAmt = (-1)*amt;
				return start + (getRand(start*amt, start*negAmt));
			}
			
			context = canvas.getContext('2d');
		
			var fillStyle = options.fillStyle ? options.fillStyle : "black";
			var fontSize = options.size ? options.size : 64;
			
		var w = (options.w ? options.w : canvas.width/5)/2	
			, h = options.h ? options.h : canvas.height/4
			, x = options.x ? options.x : (canvas.width/2)-w
			, y = options.y ? options.y : (canvas.height/2)+(h/2);
		
			context.save();
			context.fillStyle = fillStyle;
		
			context.setTransform(1,0,0,1,0,0);
			context.globalCompositeOperation = "xor";
			//context.lineWidth = 6;
			//context.strokeStyle = "#000";
			context.beginPath();
			
			var curX = startX = adjust(x)
				, curY = startY = adjust(y);

			
			var points = [
				{"x": adjust(x), "y": adjust(y) }
				, {"x": adjust(x-w), "y": adjust(y) }
				, {"x": adjust(x-w), "y": adjust(y-h) }
				, { "x": adjust(x), "y": adjust(y-h) }
				, { "x": adjust(x+w), "y": adjust(y-h) }
			//    , { "x": (x+w), "y": (y) }
			//    , { "x": (x+w)-20, "y": (y-h) }
				, { "x": adjust(x+w), "y": adjust(y) }
			];
			
			
			// move to the first point
			context.moveTo((points[0].x + points[points.length-1].x)/2, (points[0].y + points[points.length-1].y)/2);
			
			for (i = 1; i < points.length - 1; i ++) {
				var xc = (points[i].x + points[i + 1].x) / 2;
				var yc = (points[i].y + points[i + 1].y) / 2;
				context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
			}
			
			var xc = (points[i].x + points[0].x) / 2;
			var yc = (points[i].y + points[0].y) / 2;
			context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);



			context.fill(); //stroke();
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
			//console.log(arguments);
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
			//console.log(arguments);
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

			var distortionAmount = Math.min(.5, (fontSize/320));
			//console.log("distort: " + distortionAmount);
			
			
			for (var x = 0; x < text.length; x++)
			{
				context.save();
				var c = text.charAt(x);
				var metrics = context.measureText(c);
				var w = metrics.width;
		
				context.transform (1, getRand(-1*distortionAmount,distortionAmount), getRand(-1*distortionAmount,distortionAmount), 1, 0, 0);
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
