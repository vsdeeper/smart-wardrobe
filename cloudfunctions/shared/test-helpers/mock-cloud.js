/**
 * 云开发 cloud 实例 mock，供 shared 单测复用。
 * 不在 sync-cloud-shared 白名单内，不会部署到各云函数包。
 */

/**
 * @param {{ tempUrls?: Record<string, string>, uploadFileId?: string, failedFileIds?: string[] }} options
 */
export function createMockCloud(options = {}) {
  const {
    tempUrls = {},
    uploadFileId = "cloud://mock/generated.png",
    failedFileIds = [],
  } = options;

  return {
    async getTempFileURL({ fileList }) {
      return {
        fileList: fileList.map((fileID) => {
          if (failedFileIds.includes(fileID)) {
            return { fileID, status: 1, errMsg: "mock fail" };
          }
          return {
            fileID,
            status: 0,
            tempFileURL: tempUrls[fileID] || `https://mock.example/${fileID}`,
          };
        }),
      };
    },
    async uploadFile({ cloudPath }) {
      return { fileID: uploadFileId, cloudPath };
    },
  };
}
