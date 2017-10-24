const thulib = require('thulib');
const request = require('request');
const fs = require('fs');
const readChunk = require('read-chunk');
const fileType = require('file-type');
const process = require('process');
const _ = require('lodash');

const user = {
    username: process.argv[2],
    getPassword: () => process.argv[3]
};

const rootDir = '/Volumes/Data/learn.tsinghua'

// const blacklist = fs.readFileSync('blacklist').toString().split('\n')
const learn_helper = new thulib.LearnHelperUtil(user);
let current = 0;
let all = 0;
learn_helper.login().then(() => {
    learn_helper.getCourseList().then((courses) => {
        courses.forEach((course) => {
            console.log(course.courseName);
            learn_helper.getDocuments(course).then((documents) => {
                documents = _.uniqBy(documents,'title');
                all += documents.length;
                documents.forEach((document) => {
                    /*
                    if (blacklist.find(title => title == document.title)) {
                        console.log('Blacklisted: ' + document.title);
                        current++;
                        return;
                    }
                    */

                    if (Date.now() - new Date(document.updatingTime).getTime() > 1000*60*60*24*3) {
                        console.log('Skipped: ' + document.title);
                        return;
                    }

                    let fileName = rootDir + '/' + course.courseName + '/' + document.title;
                    try {
                        fs.mkdirSync(rootDir + '/' + course.courseName)
                    } catch (e) {
                    }

                    let fileStream = fs.createWriteStream(fileName);
                    let stream = request({
                        method: 'GET',
                        uri: document.url,
                        jar: learn_helper.cookies
                    }).pipe(fileStream);

                    fileStream.on('finish',() => {
                        const buffer = readChunk.sync(fileName,0,4100);
                        let result = fileType(buffer);
                        let ext = "txt";
                        if(result != null) {
                            if(result.ext == 'msi') // BUG in file-type package
                                result.ext = 'ppt';
                            ext = result.ext;
                        }
                        fs.renameSync(fileName,fileName+'.'+ext);
                        current++;
                        console.log(current + ' / ' + all + ': ' + course.courseName + '/' + document.title + ' Done');
                    });
                });
            });
        });
    });
});
