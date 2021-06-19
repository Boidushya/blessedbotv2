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
		for (i = 0; i < list.length; i++) {
			if (list[i].id === obj.id) {
				return true;
			}
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
				if (this.containsObject(this.data, this.database.completed)) {
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
						).on("finish",()=>{
							this.post();
						});
					});
			})
			.catch((err) => {
				console.log(err);
			});
	}
	post() {
		let content = {
			source: fs.createReadStream(`./image/result.${this.data.filetype}`),
			message: this.data.title,
		};
		FB.setAccessToken(process.env.TEST_TOKEN);
		FB.api("me/photos", "POST", content, (res) => {
			console.log(`Successfully posted image https://facebook.com/${res.post_id}`);
			let comment = `Original post from https://reddit.com${this.data.permalink} \n(posted on r/blessedimages by u/${this.data.author})
			\nBeep Boop! This action was automatically performed with ❤️ by a 🤖.`;
			FB.api(`${res.post_id}/comments`, "POST", {
				message:comment
			}, (response) => {
				let data = {
					created_at:Date(),
					title: this.data.title,
					post_id:res.post_id,
					permalink:`https://facebook.com/${res.post_id}`,
					comment:response.id
				}
				this.database.posts.push(data);
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
			})
		});
	}
	start() {
		this.main();
		const job = new CronJob("0 0 0 * * *", () => {
			this.main();
		});
		job.start();
	}
}

let blessedBot = new Bot();
blessedBot.start();
