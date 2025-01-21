import userProducts from "../models/productsModels.js";

export const searchAll = async (req, res) => {
  const { page, pageSize, search } = req.query;

  try {
    const totalCountResult = await userProducts.aggregate([
      {
        $match: {
          title: { $regex: search || "", $options: "i" },
        },
      },
      {
        $unionWith: {
          coll: "createblogs",
          pipeline: [
            {
              $match: {
                title: { $regex: search || "", $options: "i" },
              },
            },
          ],
        },
      },
      {
        $count: "total",
      },
    ]);
    
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    

    const result = await userProducts.aggregate([
      {
        $facet: {
          combinedData: [
            {
              $match: {
                title: { $regex: search || "", $options: "i" },
              },
            },
            {
              $project: {
                _id: 0,
                type: { $literal: "userProducts" },
                title: "$title",
                description: "$description",
              },
            },
            {
              $unionWith: {
                coll: "createblogs",
                pipeline: [
                  {
                    $match: {
                      title: { $regex: search || "", $options: "i" },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      type: { $literal: "createblogs" },
                      title: "$title",
                      text: "$text",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $project: {
          combinedData: { $slice: ["$combinedData", (page - 1) * parseInt(pageSize), parseInt(pageSize)] },
       
        },
      },
    ]);
    
    const { combinedData } = result[0];

    // The resulting 'combinedData' variable now contains the combined result.

    res.status(200).json({ data: combinedData, total:totalCount,page:page,pageSize:pageSize });
  } catch (err) {
    console.log(err.message);
    return res
      .status(500)
      .json({ message: "Error occurred", error: err.message });
  }
};
