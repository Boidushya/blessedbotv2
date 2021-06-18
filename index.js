const FB = require("fb");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { CronJob } = require("cron");
const { time } = require("console");
require("dotenv").config();

class Bot {
	constructor() {
		this.token = process.env.TOKEN;
		this.data = {};
	}
	containsObject(obj, list) {
		let i;
		for(i=0;i<list.length;i++){
			if(list[i].id === obj.id){
				return true
			};
		}
		return false;
	}
	main() {
		let js = fs.readFileSync("./database/db.json", {
			encoding: "utf8",
		});
		this.database = JSON.parse(js);
		let url =
			"https://www.reddit.com/r/blessedimages/top/.json?t=day&limit=1";
		axios
			.get(url)
			.then(({ data: res }) => {
				let item = res.data.children[0].data;
				this.data = {
					url: item.url,
					score: item.score,
					permalink: item.permalink,
					author: item.author,
					id: item.id,
					created: item.created_utc,
					title: item.title
						.replace(/[^\w\s]/g, "")
						.replace(/\s/g, "_"),
					filetype: /(?:\.([^.]+))?$/g.exec(item.url)[1],
				};
				console.log(this.containsObject(this.data, this.database.completed));
				if(this.containsObject(this.data, this.database.completed)){
					console.log(`Post already exists in database`);
					return;
				}
				this.database.completed.push(this.data);
				fs.writeFile(
					"./database/db.json",
					JSON.stringify(this.database),
					{
						encoding: "utf8",
					},
					(err) => {
						if (err) {
							console.log(
								`Error in writing database to file ${err}`
							);
						}
					}
				);
				axios
					.get(this.data.url, {
						responseType: "stream",
					})
					.then((res) => {
						res.data.pipe(
							fs.createWriteStream(
								`./image/result.${this.data.filetype}`
							)
						);
						this.post();
					});
			})
			.catch((err) => {
				console.log(err);
			});
	}
	post() {
		let comment = `Original post from https://reddit.com${this.data.permalink} posted on r/blessedimages by u/${this.data.author}
		Beep Boop! This action was automatically performed with ❤️ by a 🤖.`;
	}
	start() {
		this.main();
		// const job = new CronJob("*/5 * * * * *", () => {
		// 	this.fetchRedditData()
		// });
		// job.start();
	}
}

let blessedBot = new Bot();
blessedBot.start();
