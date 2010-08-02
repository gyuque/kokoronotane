var theApp = null;

function LatentGenerator() {
	this.upframe = $('#upform-frame');
	this.upframe2 = $('#upform-frame-2');
	this.upurl = this.upframe.attr('src');
	this.frontImage = null;
	this.frontImageRemoved = null;
	this.frontImageDelegate = new AdjusterDelegate(this);
	this.finalImage = null;

	var _this = this;

	var chk = document.getElementById('front-chk');
	$(chk).click( function(e){ _this.onChkFrontImage(this); } );
	this.onChkFrontImage(chk);
}

LatentGenerator.prototype = {
	selectedFrontPImage: function() {
		return this.frontImageDelegate ? this.frontImageDelegate.selectedPImage : null;
	},

	onIFrameLoad: function() {
		this.readIFrame(this.upframe, 0);
	},

	onIFrame2Load: function() {
		this.readIFrame(this.upframe2, 1);
	},

	readIFrame: function(iframe, tag) {
		var f = iframe.contents().find("#upform");
		if (f.length < 1) {
			var d = iframe.contents().find("#imagedata");

			if (d.length > 0) {
				this.upSuccess(d.text(), tag);
				iframe.loadedData = d.text();
			} else {
				if (iframe.contents().text().indexOf('40') == 0)
					this.upError(iframe);
			}
		} else {
			if (iframe.loadedData)
				iframe[0].contentWindow.hideForm("replace this?", iframe.loadedData);
		}
	},

	onChkFrontImage: function(e) {
		this.enableFrontImage(e.checked);
	},

	enableFrontImage: function(b) {
		var box = $('#frontimage-tool');
		if (b) {
			box.addClass('enabled');
		} else {
			box.removeClass('enabled');
			if (this.upframe2[0].contentWindow.showForm)
				this.upframe2[0].contentWindow.showForm();
			this.frontImageRemoved = this.frontImage;
			this.frontImage = null;
			if (this.adjuster) {
				this.adjuster.setFrontImage(null);
				this.adjuster.createPreviewsAll(this.selectedPImage, null);
				this.frontImageDelegate.clear();
			}

			$('#preview-container').removeClass("front-enabled");
		}
	},

	restoreForm: function(f) {
		f[0].contentWindow.location.href = this.upurl;
	},

	upError: function(f) {
		this.restoreForm(f);
		this.showError("Error: This image is invalid.");
	},

	upSuccess: function(dat, tag) {
		this.showError();
		if (tag == 0) {
			this.showDownloadLink(false);
			this.selectedPImage = null;
			this.restoreForm(this.upframe);
			$('#step1').addClass('done');
			$('#step2').addClass('ready');
			$('#step3').removeClass('ready');

			this.makePreview(dat);
		} else {
			$('#preview-container').addClass("front-enabled");

			this.restoreForm(this.upframe2);
			this.updateFrontImage(dat);
		}
	},

	updateFrontImage: function(dat) {
		var _this = this;
		var img = new Image();
		img.onload = function() {_this.onFrontImageLoaded(img);};
		img.src = dat;
	},

	onFrontImageLoaded: function(img) {
		this.frontImage = img;
		if (this.adjuster) {
			this.adjuster.setFrontImage(img);
			this.adjuster.createPreviewsAll(this.selectedPImage, null);
		}
	},

	makePreviewCaption: function(t, cls) {
		var h = document.createElement("h3");
		h.appendChild(document.createTextNode(t));

		if (cls)
			h.className = cls;

		return h;
	},

	makePreview: function(dat) {
		var cv, div, f_div;
		if (this.adjuster) {
			div   = this.adjuster.outArea;
			f_div = this.adjuster.outAreaFI;
			cv    = this.adjuster.cv;
		} else {
			var c = $('#preview-container');
			c.empty();

			var pbox = document.createElement("div");
			pbox.innerHTML = "Preview<br />";
			pbox.className = "preview-box";

			cv = document.createElement("canvas");
			cv.className = "preview-canvas";

			div = document.createElement("div");
			div.className = "preview-list latent";

			f_div = document.createElement("div");
			f_div.className = "preview-list front";

			c[0].appendChild(this.makePreviewCaption("for latent image:"));
			c[0].appendChild(div);

			c[0].appendChild(this.makePreviewCaption("for front image:", "front"));
			c[0].appendChild(f_div);

			pbox.appendChild(cv);
			c[0].appendChild(pbox);

			var tbl = document.createElement("table");
			tbl.innerHTML = "<table class=\"preview-cap\"><tbody><tr><td>Front</td><td>Latent</td><td>Result</td></tr></tbody></table>";
			pbox.appendChild(tbl);
		}

		var _this = this;
		var img = new Image();
		img.onload = function() {_this.onSourceImageLoaded(cv, img, div, f_div);};
		img.src = dat;
	},

	onSourceImageLoaded: function(cv, img, div, div2) {
		if (this.adjuster) {
			this.adjuster.replaceLatentImage(img);
			this.adjuster.createPreviewsAll(null, this.frontImageDelegate.selectedPImage);
		} else {
			this.adjuster = new Adjuster(cv, img, div, div2, this, this.frontImageDelegate);
			this.adjuster.setFrontImage(this.frontImage);
			this.adjuster.createPreviewsAll(this.selectedPImage, this.frontImageDelegate.selectedPImage);
		}
	},

	onPreviewHover: function(pimage) {
		if (!pimage)
			return null;

		var limg = this.makeLatent(pimage, this.selectedFrontPImage(), this.adjuster.sourceWidth, this.adjuster.sourceHeight);
		this.adjuster.showPreview(limg);
		return limg;
	},

	

	onPreviewOut: function() {
		this.onPreviewHover(this.selectedPImage);
	},

	onPreviewClick: function(pimage, elem) {
		this.selectedPImage = pimage;
		this.updateFinalImage();

		$(".preview-list.latent img").removeClass("selected");
		elem.className = "selected";

		this.showFinaiImage();
		$('#step3').addClass('ready');
	},

	updateFinalImage: function() {
		this.finalImage = this.onPreviewHover(this.selectedPImage);
	},

	showFinaiImage: function() {
		this.adjuster.makeFinalImage(this.finalImage, this.showDownloadLink(true));
	},

	showDownloadLink: function(b) {
		var elem = document.getElementById('dllink');
		elem.style.display = b ? "inline" : "none";
		return elem;
	},

	showError: function(msg) {
		if (!msg) {
			$('#uperror').hide();
			return;
		}

		$('#uperror').show().text(msg);
	},

	makeLatent: function(src, front, w, h) {
		var pos = 0;

		var TBL = [
			[
				[0, 255-7],
				[33, 250-7],
				[67, 247-7],
				[92, 243-7]
			],

			[
				[0, 240-4],
				[33, 235-4],
				[67, 232-4],
				[92, 228-4]
			],

			[
				[0, 225-3],
				[33, 220-3],
				[67, 217-3],
				[92, 213-3]
			],

			[
				[0, 205-3],
				[33, 200-3],
				[67+2, 197-3],
				[92+4, 193-3]
			]
		];

/*
		var TBL = [
			[0, 255],
			[33, 250],
			[67, 247],
			[92, 243]
		];
*/

		var a = new Array(src.length);
		for (var y = 0;y < h;y++) {
			for (var x = 0;x < w;x++) {
				var f = front ? (3-front[pos]) : 0;
				var tbl = TBL[f];
				var bw = tbl[src[pos]];
				a[pos++] = bw[(x+y)&1];
			}
		}

		return a;
	}
}


function AdjusterDelegate(owner)
{
	this.owner = owner;
	this.selectedPImage = null;
}

AdjusterDelegate.prototype = {
	clear: function() {
		this.selectedPImage = null;
		this.owner.updateFinalImage();
		this.owner.showFinaiImage();
	},

	onPreviewHover: function(pimage) {
		if (!pimage || !this.owner.adjuster || !this.owner.selectedPImage)
			return null;

		var limg = this.owner.makeLatent(this.owner.selectedPImage, pimage, this.owner.adjuster.sourceWidth, this.owner.adjuster.sourceHeight);
		this.owner.adjuster.showPreview(limg);
		return limg;
	},

	onPreviewClick: function(pimage, elem) {
		$(".preview-list.front img").removeClass("selected");
		elem.className = "selected";

		this.onPreviewHover(pimage);
		this.selectedPImage = pimage;

		this.owner.updateFinalImage();
		this.owner.showFinaiImage();
	},

	onPreviewOut: function() {
		this.onPreviewHover(this.selectedPImage);
	}
}

function Adjuster(cv, src, outArea, outAreaFI, listenerObj, listenerObjFI) {
	this.outArea = outArea;
	this.outAreaFI = outAreaFI;
	this.cv = cv;
	this.g = cv.getContext('2d');
	this.src = src;
	this.sourceWidth = src.width;
	this.sourceHeight = src.height;

	this.cv2 = document.createElement('canvas');
	this.g2 = this.cv2.getContext('2d');

	cv.setAttribute('width', src.width*3+2);
	cv.setAttribute('height', src.height);

	this.cv2.setAttribute('width', src.width);
	this.cv2.setAttribute('height', src.height);

	this.latenListener = listenerObj;
	this.frontListener = listenerObjFI;
	this.frontImage = null;
}

Adjuster.prototype = {
	createPreviewsAll: function(selected1, selected2) {
		if (!selected1) {
			var previewItems = this.createPreviews(this.src, this.latenListener, this.outArea);
			if (this.latenListener)
				this.latenListener.onPreviewClick(previewItems[4].pimage, previewItems[4].element);
		}

		if (this.frontImage && !selected2) {
			var previewItemsFront = this.createPreviews(this.frontImage, this.frontListener, this.outAreaFI);
			if (this.frontListener)
				this.frontListener.onPreviewClick(previewItemsFront[4].pimage, previewItemsFront[4].element);
		}

		this.g.fillStyle = "#fff";
		this.g.fillRect(this.src.width+1, 0, this.sourceWidth, this.sourceHeight);
		this.g.drawImage(this.src, this.src.width+1, 0);

		this.showFrontImageSample(this.g, this.frontImage, 0);
	},

	showFrontImageSample: function(g, i, x) {
		g.fillStyle = "#eee";
		g.fillRect(x, 0, this.sourceWidth, this.sourceHeight);

		if (i)
			g.drawImage(i, x, 0);
	},

	createPreviews: function(sourceImage, listenerObj, outArea) {
		var items = [];
		outArea.innerHTML = "";

		var gi = this.makeGrayImage(sourceImage, this.sourceWidth, this.sourceHeight);

		var GAMMAs = [1.0/4.0, 1.0/3.0, 1.0/2.0, 1.0/1.5,  1.0, 1.5, 2.0, 3.0, 4.0];
		var len = GAMMAs.length;

		for (var i = 0;i < len;i++) {
			var g = GAMMAs[i];
			(function(_this){
				var pimg = _this.createAPreview(gi, g, _this.g2);
				var img = document.createElement('img');
				img.src = _this.cv2.toDataURL('image/png');
				outArea.appendChild(img);
				$(img).hover(function(){ listenerObj.onPreviewHover(pimg, img); })
				      .click(function(){ listenerObj.onPreviewClick(pimg, img); })
				      .mouseout(function(){ listenerObj.onPreviewOut(); });

				items.push({pimage: pimg, element: img});
			})(this);
		}

		return items;
	},

	replaceLatentImage: function(img) {
		this.src = img;
	},

	setFrontImage: function(img) {
		this.frontImage = img;
	},

	render: function(d, src, w, h) {
		var pos = 0;
		var dpos = 0;
		for (var y = 0;y < h;y++) {
			for (var x = 0;x < w;x++) {
				var L = src[dpos++];
				d[pos++] = L;
				d[pos++] = L;
				d[pos++] = L;
				d[pos++] = 255;
			}
		}
	},

	showPreview: function(dat) {
		var w = this.sourceWidth;
		var h = this.sourceHeight;
		var i = this.g.getImageData(w+1, 0, w, h);
		var d = i.data;
		this.render(d, dat, w, h);

		this.g.putImageData(i, w*2+2, 0);
	},

	makeFinalImage: function(dat, a) {
		var w = this.sourceWidth;
		var h = this.sourceHeight;
		var i = this.g2.getImageData(0, 0, w, h);
		this.render(i.data, dat, w, h);
		this.g2.putImageData(i, 0, 0);

		a.innerHTML = "";
		var img = document.createElement('img');

		if (a) {
			var durl = this.cv2.toDataURL('image/png');
			img.src = durl;
			a.href = durl;
			a.appendChild(img);
		}
	},

	createAPreview: function(srcImageData, g, gOut) {
		var threshs = [0.25, 0.5, 0.75];
		var g_threshs = [0, 0, 0];
		var tones = [0,80,160,240];
		var len = threshs.length;
		for (var i = 0;i < len;i++) {
			g_threshs[i] = 255*(Math.pow(threshs[i], 1/g));
		}

		var w = srcImageData.width;
		var h = srcImageData.height;
		var pimage = this.posterization(srcImageData, g_threshs);
		var pos = 0;
		var oi = gOut.getImageData(0, 0, w, h);
		for (var y = 0;y < h;y++) {
			for (var x = 0;x < w;x++) {
				var L = tones[pimage[pos]];
				oi.data[(pos<<2)  ] = L;
				oi.data[(pos<<2)+1] = L;
				oi.data[(pos<<2)+2] = L;
				oi.data[(pos<<2)+3] = 255;

				pos++;
			}
		}

		gOut.putImageData(oi, 0, 0);
		return pimage;
	},

	makeGrayImage: function(sourceImage, sw, sh) {
		this.g.fillStyle = "#eee";
		this.g.fillRect(0, 0, sw, sh);

		this.g.drawImage(sourceImage, 0, 0);
		var i = this.g.getImageData(0, 0, sw, sh);

		var w = i.width;
		var h = i.height;

		var d = i.data;
		var pos = 0;
		for (var y = 0;y < h;y++) {
			for (var x = 0;x < w;x++) {
				var R = d[pos  ];
				var G = d[pos+1];
				var B = d[pos+2];

				var L = R*0.29891 + G*0.58661 + B*0.11448;
				d[pos++] = L;
				d[pos++] = L;
				d[pos++] = L;
				pos++;
			}
		}

		this.g.putImageData(i, 0, 0);
		return i;
	},

	posterization: function(s, g_threshs)
	{
		var w = s.width;
		var h = s.height;
		var d = s.data;

		var tlen = g_threshs.length;
		var a = new Array(w*h);

		var pos = 0;
		for (var y = 0;y < h;y++) {
			for (var x = 0;x < w;x++) {
				var L = d[pos<<2];
				a[pos] = tlen;
				for (var i = 0;i < tlen;i++) {
					if (L < g_threshs[i]) {
						a[pos] = i;
						break;
					}
				}

				pos++;
			}
		}

		return a;
	}
}

function launch()
{
	if (theApp) return true;

	var w = document.getElementById("default-warn");
	if (!w) {
		return false;
	}

	w.parentNode.removeChild(w);

	document.getElementById("main").style.display = "block";
	theApp = new LatentGenerator();
	return true;
}

window.setTimeout(launch, 10);
window.setTimeout(launch, 100);
window.setTimeout(launch, 1000);
