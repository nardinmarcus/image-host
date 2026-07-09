// 统一时间获取 —— 消除 9 处复制
// 格式暂保持原样（本地化字符串），阶段 6 改 ISO8601 + 历史数据迁移
export async function nowTime() {
  const options = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date());
}
