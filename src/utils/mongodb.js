function isIncludes(arrayPath, value) {
    return {
        $gte: [
            {
                $indexOfArray: [arrayPath, value],
            },
            0,
        ],
    };
}

function addFieldIsIncludes({ newField, arrayPath, value }) {
    return {
        $addFields: {
            [newField]: isIncludes(arrayPath, value),
        },
    };
}

module.exports = {
    isIncludes,
    addFieldIsIncludes,
};
