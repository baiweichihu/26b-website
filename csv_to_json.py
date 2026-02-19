import csv
import json

# 读取 CSV 文件
sections = []
csv_path = 'public/journals/mapping.csv'
json_path = 'public/journals/mapping.json'

try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            sections.append({
                'volume': int(row['volume'].strip()),
                'sectionIndex': int(row['sectionIndex'].strip()),
                'pdfPageStart': int(row['pdfPageStart'].strip())
            })
    
    # 写入 JSON 文件
    output = {'sections': sections}
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 转换成功！已转换 {len(sections)} 条记录到 {json_path}")
    print(f"\n生成的 JSON：")
    print(json.dumps(output, indent=2, ensure_ascii=False))
    
except FileNotFoundError:
    print(f"❌ 错误：找不到 {csv_path}，请确保文件存在")
except KeyError as e:
    print(f"❌ 错误：CSV 文件缺少列 {e}")
except ValueError as e:
    print(f"❌ 错误：数值转换失败 {e}")
except Exception as e:
    print(f"❌ 错误：{e}")
