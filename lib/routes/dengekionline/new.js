const got = require('@/utils/got');
const cheerio = require('cheerio');

const host = 'https://dengekionline.com';
const infos = {
    '': {
        category: '電撃総合',
        patch: '/',
    },
    dps: {
        category: '電撃PlayStation',
        patch: '/dps/',
    },
    nintendo: {
        category: '電撃Nintendo',
        patch: '/nintendo/',
    },
    microsoft: {
        category: '電撃Xbox',
        patch: '/microsoft/',
    },
    dpc: {
        category: '電撃PC',
        patch: '/dpc/',
    },
    gstyle: {
        category: '電撃Girl’sStyle',
        patch: '/g-style/',
    },
    arcade: {
        category: '電撃アーケードWeb',
        patch: '/arcade/',
    },
    app: {
        category: 'アプリまとめ',
        patch: '/app/',
    },
    anime: {
        category: 'アニメ',
        patch: '/tags/%E3%82%A2%E3%83%8B%E3%83%A1/',
    },
    review: {
        category: 'レビューまとめ',
        patch: '/tags/%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC/',
    },
    rank: {
        category: '販売ランキング',
        patch: '/tags/%E3%82%BD%E3%83%95%E3%83%88%E8%B2%A9%E5%A3%B2%E3%83%A9%E3%83%B3%E3%82%AD%E3%83%B3%E3%82%B0/',
    },
};

module.exports = async (ctx) => {
    // 设置参数
    const info = infos[ctx.params.type || ''];
    if (info === undefined) {
        throw Error('不存在的类型');
    }
    const patch = info.patch;
    const category = info.category;
    const title = `電撃オンライン - ${category}`;
    // 网页请求获取新闻列表
    const response = await got(patch, {
        method: 'get',
        baseUrl: host,
    });
    const data = response.data;
    const link = response.link;
    // 过滤处理新闻列表数据
    const $ = cheerio.load(data);
    const list = $('ul.gNews_list').find('a');
    const description = $('meta[name="description"]').attr('content');
    // 整理信息
    const item = await Promise.all(
        list
            .map(async (index, element) => {
                const liArr = $(element).find('li');
                const date = $(element)
                    .find('time')
                    .attr('datetime');

                const newLink = $(element).attr('href');
                const category = liArr.map((index, li) => $(li).text()).get();
                // 日本时区为东9区
                const pubDate = new Date(`${date} GMT+0900`).toUTCString();
                // 获取作者等
                const newInfo = await ctx.cache.tryGet(newLink, async () => {
                    // console.log(newLink);
                    const result = await got(newLink, {
                        method: 'get',
                        baseUrl: host,
                    });
                    const $ = cheerio.load(result.data);
                    const title = $('.gEntry_title').text();
                    const description = $('.gEntry_body')
                        .find('p')
                        .html();
                    const author = $('.gEntry_athorList')
                        .find('dd')
                        .text();
                    const info = {
                        title: title,
                        description: description,
                        author: author,
                        url: result.url,
                    };
                    return info;
                });

                const single = {
                    title: newInfo.title,
                    link: newInfo.url,
                    category: category,
                    description: newInfo.description,
                    author: newInfo.author,
                    guid: newInfo.url,
                    pubDate: pubDate,
                };
                return Promise.resolve(single);
            })
            .get()
    );
    // 设置rss
    ctx.state.data = {
        title: title,
        description: description,
        link: link,
        language: 'ja-jp',
        item: item,
    };
};
