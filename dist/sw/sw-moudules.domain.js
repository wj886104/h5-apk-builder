// 获取域名列表（从 mallinfo 的 rescue.host）
async function fetchDomainList() {
  try {
    const mallInfo = (await useStore(['mallinfo']))?.mallinfo;
    const rescueHost = mallInfo?.rescue?.host;
    if (rescueHost) {
      const list = [rescueHost];
      log("0018", list);
      return list;
    }
    return [];
  } catch (err) {
    error("0017", err);
    return [];
  }
}

// 检查域名可用性
async function checkDomainAvailability(domain) {
  try {
    const res = await (await fetch(`${domain}/${apiUrl}`)).json();
    return res?.code === 200 ? domain : false;
  } catch (error) {
    return false;
  }
}

// 查找可用域名
async function findAvailableDomain(availableDomains) {
  for (const domain of availableDomains) {
    if (await checkDomainAvailability(domain)) {
      return domain;
    }
  }
  return false;
}

const buildStringMap = () => {
  return {
    setParamsToUrlParamsarams,
    checkDomainAvailability,
    findAvailableDomain,
    availableDomains,
    fetchDomainList,
    openDb,
    getKeyFromDb,
    setKeyToDb,
    useStore,
    logger,
    apiUrl,
    error,
    logs,
    log
  };
}
