async function appendViewsCount(posts, controller) {
    // link->post hash map
    const postLinksMap = new Map(
        posts.map(post => [
            `${post.contentId.communityId}/${post.contentId.userId}/${post.contentId.permlink}`,
            post,
        ])
    );

    const { results } = await controller.callService('meta', 'getPostsViewCount', {
        postLinks: [...postLinksMap.keys()],
    });

    // link->viewsCount hash map
    const viewsCountMap = new Map(results.map(({ postLink, viewCount }) => [postLink, viewCount]));

    for (const [postLink, post] of postLinksMap) {
        post.viewsCount = viewsCountMap.get(postLink);
    }
}

module.exports = {
    appendViewsCount,
};
