import csv


def process_csv_column(file_path):
    """
    读取CSV文件，提取第三列的所有字符串，
    去掉每个字符串的前10位，然后用空格拼接。

    Args:
        file_path (str): CSV文件路径

    Returns:
        str: 处理后的字符串结果
    """
    result_parts = []

    with open(file_path, mode='r', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)

        for row in reader:
            # 确保行有足够的列（至少3列）
            if len(row) >= 3:
                third_column_value = row[2].strip()  # 获取第三列并去除首尾空格

                # 去掉前10位字符（如果长度大于10）
                if len(third_column_value) > 10:
                    truncated_value = third_column_value[27:]
                else:
                    # 如果长度不足10，则保留空字符串
                    truncated_value = ""

                if truncated_value:  # 只有非空字符串才添加
                    result_parts.append(truncated_value)

    # 用空格拼接所有处理后的字符串
    return " ".join(result_parts)


# 示例使用
if __name__ == "__main__":
    # 创建示例CSV文件



    # 处理文件
    result = process_csv_column(r'C:\Users\AAA\Downloads/novelpia_novels_2026-01-28T19-17-33.csv')
    print(f"处理结果: '{result}'")

    # 预期输出: "first second third fourth"
