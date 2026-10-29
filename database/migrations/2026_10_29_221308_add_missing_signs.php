<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Signs the original question bank never listed (1.7.2-1.7.7, most of the
     * 5.x zones, the 7.x direction signs, some plates), taken from the study
     * notes. Safe to run over a database that already has any of them.
     */
    public function up(): void
    {
        if (! Schema::hasTable('signs') || ! Schema::hasTable('sign_categories')) {
            return;
        }

        $categories = DB::table('sign_categories')->pluck('id', 'group_number');

        foreach ($this->signs() as $sign) {
            $categoryId = $categories[$sign['group']] ?? null;

            if ($categoryId === null || DB::table('signs')->where('title', $sign['title'])->exists()) {
                continue;
            }

            DB::table('signs')->insert([
                'sign_category_id' => $categoryId,
                'position' => $sign['position'],
                'is_child' => $sign['is_child'],
                'image' => $sign['image'],
                'title' => $sign['title'],
                'title_en' => $sign['title_en'],
                'description' => $sign['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('signs')) {
            DB::table('signs')->whereIn('title', array_column($this->signs(), 'title'))->delete();
        }
    }

    /**
     * @return array<int, array{group: int, position: int, is_child: bool, image: string, title: string, title_en: string, description: string}>
     */
    private function signs(): array
    {
        return [
            ['group' => 1, 'position' => 7, 'is_child' => true, 'image' => 'sign_1.7.2.-1.7.7.svg', 'title' => '1.7.2.-1.7.7. მეორეხარისხოვანი გზის შეერთება', 'title_en' => 'Secondary road joining', 'description' => 'გვერდითი გზა უერთდება შენსას და მისი მძღოლები გითმობენ. მარჯვნიდან: 1.7.2, 1.7.4, 1.7.6. მარცხნიდან: 1.7.3, 1.7.5, 1.7.7.'],
            ['group' => 4, 'position' => 9, 'is_child' => true, 'image' => 'sign_4.9.1.-4.9.3.svg', 'title' => '4.9.1.-4.9.3. სახიფათო ტვირთის გადამზიდავის მოძრაობის მიმართულება', 'title_en' => 'Route for dangerous goods', 'description' => 'სახიფათო ტვირთის მანქანა მიდის ნაჩვენები მიმართულებით.'],
            ['group' => 5, 'position' => 12, 'is_child' => false, 'image' => 'sign_5.12.svg', 'title' => '5.12. ავტობუსების საპირისპირო ზოლიანი გზის დასასრული', 'title_en' => 'End of road with a contraflow bus lane', 'description' => 'მთავრდება გზა ავტობუსების საპირისპირო ზოლით (5.11).'],
            ['group' => 5, 'position' => 15, 'is_child' => true, 'image' => 'sign_5.15.2.svg', 'title' => '5.15.2. ზოლზე მოძრაობის მიმართულებები', 'title_en' => 'Direction for one lane', 'description' => 'ერთი ზოლიდან ნებადართული მიმართულებები.'],
            ['group' => 5, 'position' => 15, 'is_child' => true, 'image' => 'sign_5.15.4.svg', 'title' => '5.15.4. ზოლის დასაწყისი', 'title_en' => 'Middle lane begins', 'description' => 'სამზოლიან გზაზე შუა ზოლი შენი მიმართულებისთვის იწყება.'],
            ['group' => 5, 'position' => 16, 'is_child' => false, 'image' => 'sign_5.16.svg', 'title' => '5.16. ავტობუსის / ტროლეიბუსის გაჩერების ადგილი', 'title_en' => 'Bus / trolleybus stop', 'description' => 'ასევე ტაქსის დგომის ადგილი. 15 მ-ზე ახლოს გაჩერება აკრძალულია.'],
            ['group' => 5, 'position' => 28, 'is_child' => false, 'image' => 'sign_5.28.svg', 'title' => '5.28. სადგომის შეზღუდვის ზონის დასასრული', 'title_en' => 'End of parking restriction zone', 'description' => 'სადგომის შეზღუდვის ზონა (5.27) მთავრდება.'],
            ['group' => 5, 'position' => 29, 'is_child' => false, 'image' => 'sign_5.29.svg', 'title' => '5.29. რეგულირებადი სადგომი ზონა', 'title_en' => 'Regulated parking zone', 'description' => 'დგომა რეგულირდება (ხშირად ფასიანია).'],
            ['group' => 5, 'position' => 30, 'is_child' => false, 'image' => 'sign_5.30.svg', 'title' => '5.30. რეგულირებადი სადგომი ზონის დასასრული', 'title_en' => 'End of regulated parking zone', 'description' => 'რეგულირებადი სადგომი ზონა (5.29) მთავრდება.'],
            ['group' => 5, 'position' => 31, 'is_child' => false, 'image' => 'sign_5.31.svg', 'title' => '5.31. მაქსიმალური სიჩქარის შეზღუდვის ზონა', 'title_en' => 'Speed-limit zone', 'description' => 'მთელ ზონაში ნაჩვენები სიჩქარე მოქმედებს.'],
            ['group' => 5, 'position' => 32, 'is_child' => false, 'image' => 'sign_5.32.svg', 'title' => '5.32. სიჩქარის შეზღუდვის ზონის დასასრული', 'title_en' => 'End of speed-limit zone', 'description' => 'სიჩქარის შეზღუდვის ზონა (5.31) მთავრდება.'],
            ['group' => 5, 'position' => 33, 'is_child' => false, 'image' => 'sign_5.33.svg', 'title' => '5.33. ქვეითთა ზონა', 'title_en' => 'Pedestrian zone', 'description' => 'მხოლოდ ქვეითები.'],
            ['group' => 5, 'position' => 34, 'is_child' => false, 'image' => 'sign_5.34.svg', 'title' => '5.34. ქვეითთა ზონის დასასრული', 'title_en' => 'End of pedestrian zone', 'description' => 'ქვეითთა ზონა (5.33) მთავრდება.'],
            ['group' => 5, 'position' => 35, 'is_child' => false, 'image' => 'sign_5.35.svg', 'title' => '5.35. საავადმყოფო', 'title_en' => 'Hospital', 'description' => 'ახლოს საავადმყოფოა. მოერიდე ზედმეტ ხმაურს.'],
            ['group' => 7, 'position' => 9, 'is_child' => true, 'image' => 'sign_7.9.1.svg', 'title' => '7.9.1.-7.9.2. მიმართულების წინასწარი მაჩვენებელი', 'title_en' => 'Advance direction sign', 'description' => 'მიმართულებები პუნქტებისკენ და შეზღუდვების შემოვლა.'],
            ['group' => 7, 'position' => 10, 'is_child' => true, 'image' => 'sign_7.10.1.svg', 'title' => '7.10.1.-7.10.2. მიმართულების მაჩვენებელი', 'title_en' => 'Direction sign', 'description' => 'მიმართულება და მანძილი (კმ).'],
            ['group' => 7, 'position' => 11, 'is_child' => false, 'image' => 'sign_7.11.svg', 'title' => '7.11. ობიექტის დასახელება', 'title_en' => 'Name of object', 'description' => 'ქუჩა, მდინარე, ტბა, უღელტეხილი, ღირსშესანიშნაობა.'],
            ['group' => 7, 'position' => 12, 'is_child' => false, 'image' => 'sign_7.12.svg', 'title' => '7.12. მანძილის მაჩვენებელი', 'title_en' => 'Distance sign', 'description' => 'მანძილი (კმ) მარშრუტზე მდებარე პუნქტებამდე.'],
            ['group' => 7, 'position' => 13, 'is_child' => false, 'image' => 'sign_7.13.svg', 'title' => '7.13. საკილომეტრო ნიშანი', 'title_en' => 'Kilometre post', 'description' => 'მანძილი გზის დასაწყისიდან ან ბოლომდე.'],
            ['group' => 7, 'position' => 14, 'is_child' => true, 'image' => 'sign_7.14.1.svg', 'title' => '7.14.1.-7.14.2. მარშრუტის ნომერი', 'title_en' => 'Route number', 'description' => 'გზის ნომერი (და მიმართულება).'],
            ['group' => 7, 'position' => 16, 'is_child' => false, 'image' => 'sign_7.16.svg', 'title' => '7.16. „სდექ“ ხაზი', 'title_en' => 'Stop line (sign)', 'description' => 'სად გაჩერდე წითელზე ან არარეგულირებულ რკინიგზის გადასასვლელთან.'],
            ['group' => 7, 'position' => 17, 'is_child' => false, 'image' => 'sign_7.17.svg', 'title' => '7.17. შემოვლის სქემა', 'title_en' => 'Detour scheme', 'description' => 'დაკეტილი მონაკვეთის შემოვლის რუკა.'],
            ['group' => 7, 'position' => 18, 'is_child' => true, 'image' => 'sign_7.18.1.-7.18.3.svg', 'title' => '7.18.1.-7.18.3. შემოვლის მიმართულება', 'title_en' => 'Detour direction', 'description' => 'გაჰყევი შემოვლით გზას. დგას ყოველი გზაჯვარედინის წინ.'],
            ['group' => 7, 'position' => 19, 'is_child' => true, 'image' => 'sign_7.19.1.svg', 'title' => '7.19.1.-7.19.2. სხვა სავალ ნაწილზე გადასვლა', 'title_en' => 'Move to the other carriageway', 'description' => 'როგორ გადახვიდე მეორე სავალ ნაწილზე, თუ შენი დაკეტილია.'],
            ['group' => 8, 'position' => 8, 'is_child' => false, 'image' => 'sign_8.8.svg', 'title' => '8.8. ფასიანი მომსახურება', 'title_en' => 'Paid service', 'description' => 'სადგომი (7.4) ფასიანია.'],
            ['group' => 8, 'position' => 9, 'is_child' => false, 'image' => 'sign_8.9.svg', 'title' => '8.9. დგომის ხანგრძლივობის შეზღუდვა', 'title_en' => 'Parking time limit', 'description' => 'დგომის მაქსიმალური დრო.'],
            ['group' => 8, 'position' => 20, 'is_child' => true, 'image' => 'sign_8.20.1.-8.20.2.svg', 'title' => '8.20.1.-8.20.2. საწევრის ტიპი', 'title_en' => 'Axle type', 'description' => 'ახლოს მდებარე ღერძების რაოდენობა (3.12-თან).'],
            ['group' => 8, 'position' => 21, 'is_child' => true, 'image' => 'sign_8.21.1.svg', 'title' => '8.21.1.-8.21.3. სამარშრუტო ტრანსპორტის სახეობა', 'title_en' => 'Public-transport type', 'description' => 'სადგომი მეტროსთან: მეტრო, ავტობუსი/ტროლეიბუსი, ტრამვაი.'],
        ];
    }
};
