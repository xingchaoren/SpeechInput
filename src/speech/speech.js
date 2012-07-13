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
				}
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
			break;
		case 6:
			this.onerror("No callback specified for JSONP",code);
			break;
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
		var self = this;
		config.callback = config.callback || function() {
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
				config.callback.call(self,Speech.prototype.ajax.parse(this.response));
			}
		};
		xhr.onerror = function() {
			console.log("Error while loading url:" + config.url);
			self.error.call(self,2);
		};

		xhr.send();
	},
	jsonp:function(url,callback){
		var id = this.randomString(10);
		var head = document.getElementsByTagName("head")[0];  
		var script = document.createElement("script");
		
		url += (/\?/.test( url ) ? "&" : "?") + "callback=" + id;

		window[id] = (function(callback,id,data){
			callback.call(this,data);
			document.head.removeChild(document.querySelector("#" + id));
			delete window[id];
		}).bind(this,callback,id); 

		script.type = "text/javascript";  
		script.id = id;
		script.src = url;  
		head.appendChild(script);
	},
	nav: function(callback) {
		var self = this;
		callback = callback || function(){}; 
		if ('geolocation' in window.navigator){
			navigator.geolocation.getCurrentPosition(function(position) {
				self.geo = (position.coords.latitude.toString() + "," + position.coords.longitude.toString());
				callback.call(self,self.geo);
			}, function(error) {
				self.geo = null;
				self.error(5);
			});
		} else {
			self.geo = null;
			self.error(4);
		}
		return this.geo;
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
		options = options || {};
		if (!('query' in options)) {
			this.error(3);
			return;
		}
		this.ajax.call(this,{
			url: "https://gdata.youtube.com/feeds/api/videos?alt=json&q=" + options.query + "&max-results=" + ((options.max).toString() || (10).toString()),
			method: "GET",
			callback: function(result) {
				var data = [];
				if (!!result.feed.entry) {
					result.feed.entry.forEach(function(entry, i) {
						data[i] = {};
						var properties = ['title','description','author','url','category','rating','viewCount'];
						var link = ['media$group.media$title.$t','media$group.media$description.$t','author[0].name.$t','media$group.media$content[0].url','media$group.media$category[0].$t','gd$rating.average','yt$statistics.viewCount'];
						for (var x = 0; x < properties.length; x++){
							try {
								data[i][properties[x]] = eval('entry.' + link[x]);
							} catch(e){
								delete data[i][properties[x]];
								continue;
							}
						}
						data[i].thumbnail = (function(){
							var array = [];
							if("media$group" in entry && typeof(entry.media$group.media$thumbnail) !== 'undefined'){
								entry.media$group.media$thumbnail.forEach(function(self,i){
									array[i] = self.url;
								});
								return array;
							} else {
								delete data[i].thumbnail;
								return;
							}
						})();
					});

					options.callback(data);
				} else {
					this.error(1);
				}
			}
		});
	},
	key:function(service,key){
		var script = document.createElement("script");
		script.type = "text/javascript";
		switch(service){
			case "maps":
				script.src = "http://maps.googleapis.com/maps/api/js?sensor=true&key=" + key;
				break;
			case "other":
				script.src = key;
				break;
		}
		document.body.appendChild(script);
	},
	twitter: function(options) {
		options = options || {};
		if (!options.query) {
			this.error(3);
			return;
		}
		this.twitter.callback = options.callback || function(){
			this.error(6);
		};
		var url = "http://search.twitter.com/search.json?include_entities=true&rpp=" + ((options.max).toString() || (10).toString()) + "&q=" + options.query + (!!(this.geo && options.nav) ? "&geocode=" + this.geo + "," + (options.radius || "2km") : "");
		this.jsonp(url,function(result){
			var data = [];
			result.results.forEach(function(self,i){
				data[i] = {};
				var properties = ['text','profile_image_url','from_user','from_user_name','geo','to_user','entities'];
				for (var x = 0; x < properties.length; x++){
					try {
						if(!!self[properties[x]].toString()){
							data[i][properties[x]] = self[properties[x]];
						}
					} catch(e){
						delete data[i][properties[x]];
						continue;
					}
				}
			});

			this.twitter.callback.call(this,data);
		});
	},
	randomString: function(length){
		var string = [];
		for (var i = 0; i < length; i++) {
			var type = (i%2 == 0)?97:65;
			string[i] = String.fromCharCode(type + Math.round(Math.random() * 25));
		};
		return string.join("");
	}
};

Speech.prototype.ajax.parse = function(data) {
	try {
		JSON.parse(data);
	} catch (e) {
		return data;
	}
	return JSON.parse(data);

};