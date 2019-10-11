function isIncludes({ newField, arrayPath, value }) {
    return {
        $addFields: {
            [newField]: {
                $gte: [
                    {
                        $indexOfArray: [arrayPath, value],
                    },
                    0,
                ],
            },
        },
    };
}

module.exports = {
    isIncludes,
};
