var Speech = function(target) {
		var input = target || "input[type=speech]";
		this.target = Array.prototype.slice.call(document.querySelectorAll(input),0);
		for (var i = this.target.length - 1; i >= 0; i--) {
			if ("webkitSpeech" in this.target[i]) {
				this.target[i].webkitSpeech = "true";
			} else {
				Speech.prototype.error(0);
				break;
			}
		}
		this.onerror = function(type) {
			throw new Error(type);
		};

		/*if (options.nav === true) {
			Speech.prototype.nav();
		}*/
	};
Speech.prototype = {
	on:function(type,callback){
		switch(type){
			case 'speech':
				var self = this;
				for (var i = 0; i < this.target.length; i++) {
					self.event(this.target[i],callback,self);
				};
				break;
			case 'error':
				this.onerror = callback(type,code);
				break;
		}
	},
	error: function(error,code) {
		switch (error) {
		case 0:
			this.onerror("Your Browser does no support Speech Input",code);
			break;
		case 1:
			this.onerror("No results available",code);
			break;
		case 2:
			this.onerror("Ajax Error",code);
			break;
		case 3:
			this.onerror("No Search Query",code);
			break;
		case 4:
			this.onerror("Geolocation API is not supported",code);
			break;
		case 5:
			this.onerror("User denied acces to Location",code); 
		}
	},
	event: function(target,callback,self) {
		target.onwebkitspeechchange = function() {
			target.dataset.speech = target.value;
			callback.call(self,target.value);
			target.value = "";
			target.blur();
		};
	},
	ajax: function(config) {
		config.callback = config.callback ||
		function() {
			console.log("Error: No callback specified");
		};
		if (!(/(GET|POST|HEAD)/i.test(config.method))) {
			config.method = "GET";
		}
		var xhr = new XMLHttpRequest();
		xhr.open(config.method || 'GET', config.url || "", true);
		xhr.responseType = config.type || 'text';

		xhr.onload = function(e) {
			if (this.status == "200") {
				config.callback(Speech.prototype.ajax.parse(this.response));
			}
		};
		xhr.onerror = function() {
			console.log("Error while loading url:" + config.url);
			Speech.prototype.error(2);
		};

		xhr.send();
	},
	nav: function() {
		if ('geolocation' in window.navigator){
			navigator.geolocation.getCurrentPosition(function(position) {
				this.geo = (position.coords.latitude.toString() + "," + position.coords.longitude.toString());
			}, function(error) {
				this.geo = null;
			});
		} else {
			Speech.prototype.geo = null;
			this.error(4);
		}
		return Speech.prototype.geo;
	},
	facebook: function(config) {
		if (!config.query) {
			this.error(3);
			return;
		}
		this.ajax({
			url: "https://graph.facebook.com/search?type=post&limit=" + ((config.max).toString() || (10).toString()) + "&q=" + config.query,
			method: "GET",
			callback: function(data) {
				var FacebookData = [];
				if ( !! data.data) {
					data.data.forEach(function(self, i) {
						FacebookData[i] = {};
						if(!!self.likes){
							var list = [];
							self.likes.data.forEach(function(self){
								list.push(self.name);
							});
							FacebookData[i].likes = {
								count:self.likes.count,
								users:list
							};
						}
						if(!!self.shares){
							FacebookData[i].shares = self.shares.count;
						}
						if(!!self.story){
							FacebookData[i].story = self.story;
						}
						FacebookData[i].user = self.from.name;
						switch (self.type) {
						case "status":
							FacebookData[i].type = "status";
							FacebookData[i].text = self.message;
							break;
						case "photo":
							FacebookData[i].type = "photo";
							FacebookData[i].url = self.picture;
							FacebookData[i].link = self.link;
							FacebookData[i].caption = self.caption;
							break;
						case "link":
							FacebookData[i].type = "link";
							break;
						case "video":
							FacebookData[i].type = "video";

							FacebookData[i].video = {
								name:self.name,
								description:self.description,
								thumbnail:self.picture,
								link:self.link,
								url:self.source,
								youtube:(new RegExp("\\/www\\.youtube\\.com\\/watch").test(self.source))?true:false
							};
							break;
						}
					});
					config.callback(FacebookData);
				} else {
					Speech.prototype.error(1);
				}
			}
		});
	},
	youtube: function(options) {
		var options = options || {};
		if (!'query' in options) {
			this.error(3);
			return;
		}
		this.ajax({
			url: "https://gdata.youtube.com/feeds/api/videos?alt=json&q=" + options.query + "&max-results=" + ((options.max).toString() || (10).toString()),
			method: "GET",
			callback: function(data) {
				var YoutubeData = [];
				if ( !! data.feed.entry) {
					data.feed.entry.forEach(function(entry, i) {
						YoutubeData[i] = {};
						YoutubeData[i].title = entry.media$group.media$title.$t;
						YoutubeData[i].description = entry.media$group.media$description.$t;
						YoutubeData[i].author = entry.author[0].name.$t;
						YoutubeData[i].url = entry.media$group.media$content[0].url;
						YoutubeData[i].thumbnail = (function(){
							var array = [];
							entry.media$group.media$thumbnail.forEach(function(self,i){
								array[i] = self.url
							});
							return array;
						})();
						YoutubeData[i].category = entry.media$group.media$category[0].$t;
						YoutubeData[i].rating = entry.gd$rating.average;
						YoutubeData[i].viewCount = entry.yt$statistics.viewCount;
					});

					options.callback(YoutubeData);
				} else {
					Speech.prototype.error(1);
				}
			}
		});
	}
	/*,
	twitter: function(config) {
		if (!config.query) {
			this.error(3);
			return;
		}
		Speech.prototype.nav();
		this.ajax({
			url: "http://search.twitter.com/search.json?include_entities=true&rpp=" + ((config.max).toString() || (10).toString()) + "&q=" + config.query + ( !! (this.geo && config.nav) ? "&geocode=" + this.geo + "," + config.radius || "2km" : ""),
			method: "GET",
			callback: function(data) {
				console.log(data);
				//config.callback(data);
			}
		});
	}*/
};

Speech.prototype.ajax.parse = function(data) {
	try {
		JSON.parse(data);
	} catch (e) {
		return data;

	}
	return JSON.parse(data);

};