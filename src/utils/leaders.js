const LeaderModel = require('../models/Leader');
const ProfileModel = require('../models/Profile');

const TOP_LEADERS_COUNT = 3;

async function reorderLeaders(communityId) {
    const leaders = await LeaderModel.find(
        { communityId },
        {
            _id: false,
            userId: true,
            position: true,
            isActive: true,
            hasRating: true,
            inTop: true,
        },
        { sort: { hasRating: -1, isActive: -1, ratingNum: -1, userId: 1 }, lean: true }
    );

    let currentInTop = true;

    for (let i = 0; i < leaders.length; i++) {
        const { userId, position, isActive, hasRating, inTop } = leaders[i];

        if (currentInTop && (i >= TOP_LEADERS_COUNT || !hasRating || !isActive)) {
            currentInTop = false;
        }

        // Позиции начинаем с 1
        const updatedPosition = i + 1;

        if (position !== updatedPosition || currentInTop !== inTop) {
            await LeaderModel.updateOne(
                { communityId, userId },
                {
                    position: updatedPosition,
                    inTop: currentInTop,
                }
            );

            if (currentInTop !== inTop) {
                const action = currentInTop ? '$addToSet' : '$pull';

                await ProfileModel.updateOne({
                    [action]: {
                        leaderIn: communityId,
                    },
                });
            }
        }
    }
}

module.exports = {
    reorderLeaders,
};
