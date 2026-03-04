# Product_AMI 🏭

**Product Is All You Need** - คลังรวบรวมโปรแกรม เครื่องมือคำนวณ และโค้ดสำหรับการวางแผนและควบคุมการผลิต (Production Planning and Control - PPC)

รีโพสิทอรีนี้ประกอบด้วย Jupyter Notebooks, Excel files, และ Web Applications สำหรับการวิเคราะห์และคำนวณทางด้านวิศวกรรมอุตสาหการ (Industrial Engineering) ครอบคลุมเนื้อหาต่างๆ เช่น การพยากรณ์ การจัดการสินค้าคงคลัง MRP และการบริหารโครงการ

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

### 1. 🧮 เครื่องมือคำนวณผ่านเว็บ (Web-based Calculators)
ระบบแอปพลิเคชันบนเว็บที่พัฒนาด้วย HTML, CSS, JavaScript พื้นฐาน ใช้งานง่ายและทดสอบได้ทันที:
- **[CPM / PERT Calculator (`CPM_Calculator/`)](./CPM_Calculator)**
  - `index.html`: เครื่องมือสำหรับการวิเคราะห์โครงการด้วยวิธี **CPM (Critical Path Method)** รองรับการสร้างแผนภาพแบบ AON (Activity on Node) และหาเส้นทางวิกฤต (Critical Path)
  - `pert.html`: เครื่องมือวิเคราะห์ด้วยวิธี **PERT (Program Evaluation and Review Technique)** รองรับการคำนวณความน่าจะเป็นของเวลาโครงการจากเวลา 3 ค่า (Optimistic, Most Likely, Pessimistic)
- **[Line Balancing / Workstation Assignment (`Weight_work/`)](./Weight_work)**
  - `index.html`: เครื่องมือสำหรับการจัดสมดุลสายการผลิต (Line Balancing) รองรับการจัดสรรงานเข้าสถานีด้วยอัลกอริทึมเช่น *Region Approach* เพื่อให้ได้ประสิทธิภาพสูงสุด

### 2. 📓 สมุดข้อมูลการวิเคราะห์ (Jupyter Notebooks)
ไฟล์รวมโค้ด Python สำหรับวิเคราะห์และคำนวณหัวข้อต่างๆ ในวิชา PPC:
- **`2_Forecast.ipynb`** - การพยากรณ์ความต้องการ (Demand Forecasting) - *แก้ไขบั๊กช่อง Adj. EXP เรียบร้อยแล้ว*
- **`4_main_production.ipynb`** - การกำหนดการตารางการผลิตหลัก (Master Production Scheduling - MPS)
- **`5_Inventory_Analysis_and_Control.ipynb`** - การวิเคราะห์และควบคุมสินค้าคงคลัง (Inventory Analysis & Control)
- **`6_Material_Requirement_Planning.ipynb`** - การวางแผนความต้องการวัสดุ (Material Requirement Planning - MRP)
- **`7_Job_Sequencing_and_Scheduling.ipynb`** - การจัดลำดับงานและการจัดตารางการทำงาน (Job Sequencing & Scheduling)
- **`9_Project_Management.ipynb`** - เนื้อหาและโค้ดตัวอย่างสำหรับการบริหารและจัดตารางโครงการ

### 3. 📊 ไฟล์ข้อมูลและเอกสารประกอบ (Data & Documents)
- **ข้อมูลแบบฝึกหัด (Data):** การคำนวณต้นแบบและข้อมูลดิบในไฟล์ Excel (เช่น `Forecast.xlsx`, `3_EX_2.xlsx`, `4_EX_1.xlsx`)
- **เอกสารประกอบ (Documents):** สไลด์ PDF สำหรับศึกษาเพิ่มเติมเกี่ยวกับทฤษฎี (ได้แก่ บทนำการวางแผนการผลิต, ทฤษฎีสินค้าคงคลัง เป็นต้น)

## 🚀 การจัดการปัญหาและอัปเดตล่าสุด
- ✅ **Forecast Calculation Fix:** อัปเดตและแก้ไขข้อผิดพลาด (Bug Fix) ของการคำนวณ `Adj. EXP` ให้ถูกต้องเรียบร้อยแล้ว
- ✅ **Region Approach Debugging:** ปรับปรุงและทดสอบกระบวนการทำงานของการรวมสถานี (Workstation Assignment) ด้วย Region Approach
- ✅ **Diagramming Improvements:** ปรับปรุงความสามารถในการสร้างและจัดรูปแบบแผนภาพเครือข่ายโครงการทั้งแบบอิงตามโหนด (AON) ให้แสดงผลดียิ่งขึ้น

## 🛠️ เครื่องมือและเทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend / UI:** HTML5, CSS3, JavaScript (Vanilla JS), และไลบรารีสำหรับการวาดกราฟเครือข่าย (`Vis.js`)
- **Data Engineering & Analysis:** Python 3, Pandas, Jupyter Notebook
- **Data Storage:** ข้อมูลจัดเก็บและนำเข้าในรูปแบบ Microsoft Excel (.xlsx)
---
*Developed & Maintained by the AMI Team*
