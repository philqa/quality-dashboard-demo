const {Octokit} = require("octokit");
const octokit = new Octokit();
// unauth'd github API is limited to 60 reqs/hour so you may need to auth using a token, details below & how to pass to octokit
// https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#authentication
// https://github.com/settings/tokens
//const octokit = new Octokit({auth: `token ${token}`});
const axios = require('axios');

const repos = [
    {owner: 'facebook', repo: 'react'},
    {owner: 'angular', repo: 'angular.js'},
    {owner: 'vuejs', repo: 'vue'},
    {owner: 'emberjs', repo: 'ember.js'}
]

// https://docs.github.com/en/rest/reference/repos#get-a-repository (4 requests total)
function getOpenPullRequestCount() {
    for (let i = 0; i < repos.length; i++) {
        octokit.rest.repos
            .get({
                owner: repos[i].owner,
                repo: repos[i].repo,
            })
            .then(({data}) => {
                //console.log(data.open_issues_count);
                publishToInflux('github_issues,repo=' + repos[i].repo + ' value=' + data.open_issues_count + ' ' + new Date().getTime() + '000000')
            })
    }
}

// https://docs.github.com/en/rest/reference/issues#list-repository-issues (4 requests total)
function getOpenIssuesNoComments() {
    for (let i = 0; i < repos.length; i++) {
        octokit.request('GET /repos/{owner}/{repo}/issues', {
            owner: repos[i].owner,
            repo: repos[i].repo,
            state: 'open',
            per_page: 100,
            sort: 'asc'
        })
            .then(({data}) => {
                //console.log(data);
                let totalNoComments = 0;
                for (let j = 0; j < repos.length; j++) {
                    if (data[j].comments === 0) {
                        totalNoComments++;
                    }
                }
                publishToInflux('github_issues_no_comments,repo=' + repos[i].repo + ' value=' + totalNoComments + ' ' + new Date().getTime() + '000000');
            })
    }
}

// https://docs.github.com/en/rest/reference/metrics#get-the-last-year-of-commit-activity (4 requests total)
function getMetricsCommitActivityPastYear() {
    for (let i = 0; i < repos.length; i++) {
        octokit.request('GET /repos/{owner}/{repo}/stats/commit_activity', {
            owner: repos[i].owner,
            repo: repos[i].repo
        })
            .then(({data}) => {
                //console.log(data);
                for (let j = 0; j < data.length; j++) {
                    publishToInflux('github_commits_per_week_past_year,repo=' + repos[i].repo + ' value=' + data[j].total + ' ' + data[j].week + '000000000');
                }
            })
    }
}

function publishToInflux(data) {
    console.log(data);
    axios.post('http://localhost:8086/write?db=test', data)
        .then(res => {
            console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
            console.error(error)
        })
}

getOpenPullRequestCount();
getOpenIssuesNoComments();
getMetricsCommitActivityPastYear();

