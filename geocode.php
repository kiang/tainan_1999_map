<?php

$config = require __DIR__ . '/config.php';
/*
 * Array
  (
  [service_request_id] => UN201504150001
  [requested_datetime] => 2015-04-15 00:02:00.0
  [status] => 未處理
  [keyword] => 0
  [area] => 柳營區
  [service_name] => 髒亂及污染
  [agency] => 0
  [subproject] => 空氣汙染
  [description] => 柳營奇美醫院附近 空氣汙染
  [address_string] => 柳營奇美醫院附近
  [lat] => 0
  [long] => 0
  [service_notice] =>
  [updated_datetime] => null
  [expected_datetime] => 2015-04-22 00:02:00.0
  )
 */
$replacments = array(
    '巿' => '市',
    '０' => '0', '１' => '1', '２' => '2', '３' => '3', '４' => '4', '５' => '5',
    '６' => '6', '７' => '7', '８' => '8', '９' => '9',
    'Ｆ' => 'F', 'Ｂ' => 'B', '－' => '-'
);
$weekly = array();
foreach (glob($config['paths']['data'] . '/requests/*/*/*/*.json') AS $jsonFile) {
    $json = json_decode(file_get_contents($jsonFile), true);
    foreach ($json AS $k => $v) {
        if (is_array($v)) {
            $json[$k] = '';
        }
    }
    $requestTime = strtotime($json['requested_datetime']);
    $key = date('o-W', $requestTime);
    if (!isset($weekly[$key])) {
        $dataPath = __DIR__ . '/data/' . date('o', $requestTime);
        if (!file_exists($dataPath)) {
            mkdir($dataPath, 0777, true);
        }
        $weekly[$key] = array(
            'key' => date('o/W', $requestTime),
            'fh' => fopen($dataPath . '/' . date('W', $requestTime) . '.csv', 'w'),
            'begin' => $requestTime,
            'end' => $requestTime,
            'count' => 1,
        );
    } else {
        if ($requestTime > $weekly[$key]['end']) {
            $weekly[$key]['end'] = $requestTime;
        } elseif ($requestTime < $weekly[$key]['begin']) {
            $weekly[$key]['begin'] = $requestTime;
        }
        ++$weekly[$key]['count'];
    }
    if ($json['lat'] > 23.413740929 || $json['lat'] < 22.887506857 || $json['long'] > 120.65626753 || $json['long'] < 120.02304376) {
        $json['lat'] = 0;
    }
    if (is_string($json['address_string']) && empty($json['lat'])) {
        $pos = strpos($json['address_string'], '號');
        if (false !== $pos) {
            $json['address_string'] = substr($json['address_string'], 0, $pos) . '號';
            $json['address_string'] = preg_replace('/\\((.*)\\)/', '', $json['address_string']);
            $json['address_string'] = strtr($json['address_string'], $replacments);
            if (!empty($json['area'])) {
                $areaPos = strpos($json['address_string'], $json['area']);
                if (false !== $areaPos) {
                    $json['address_string'] = $json['area'] . substr($json['address_string'], $areaPos + strlen($json['area']));
                }
            }
            $json['address_string'] = '臺南市' . $json['address_string'];
            $sha = sha1($json['address_string']);
            $path = implode('/', array(
                $config['paths']['sha'],
                substr($sha, 0, 3),
                substr($sha, 3, 3),
            ));
            if (!file_exists($path)) {
                mkdir($path, 0777, true);
            }
            $shaFile = $path . '/' . $sha;
            if (!file_exists($shaFile)) {
                $apiUrl = $config['tgos']['url'] . '?' . http_build_query(array(
                            'oAPPId' => $config['tgos']['APPID'], //應用程式識別碼(APPId)
                            'oAPIKey' => $config['tgos']['APIKey'], // 應用程式介接驗證碼(APIKey)
                            'oAddress' => $json['address_string'], //所要查詢的門牌位置
                            'oSRS' => 'EPSG:4326', //回傳的坐標系統
                            'oFuzzyType' => '2', //模糊比對的代碼
                            'oResultDataType' => 'JSON', //回傳的資料格式
                            'oFuzzyBuffer' => '0', //模糊比對回傳門牌號的許可誤差範圍
                            'oIsOnlyFullMatch' => 'false', //是否只進行完全比對
                            'oIsLockCounty' => 'true', //是否鎖定縣市
                            'oIsLockTown' => 'false', //是否鎖定鄉鎮市區
                            'oIsLockVillage' => 'false', //是否鎖定村里
                            'oIsLockRoadSection' => 'false', //是否鎖定路段
                            'oIsLockLane' => 'false', //是否鎖定巷
                            'oIsLockAlley' => 'false', //是否鎖定弄
                            'oIsLockArea' => 'false', //是否鎖定地區
                            'oIsSameNumber_SubNumber' => 'true', //號之、之號是否視為相同
                            'oCanIgnoreVillage' => 'true', //找不時是否可忽略村里
                            'oCanIgnoreNeighborhood' => 'true', //找不時是否可忽略鄰
                            'oReturnMaxCount' => '0', //如為多筆時，限制回傳最大筆數
                ));
                file_put_contents($shaFile, file_get_contents($apiUrl));
                error_log("getting {$json['address_string']}");
            }
            $content = file_get_contents($shaFile);
            $pos = strpos($content, '{');
            $posEnd = strrpos($content, '}') + 1;
            $jsonResult = json_decode(substr($content, $pos, $posEnd - $pos), true);
            if (isset($jsonResult['AddressList'][0])) {
                $json['lat'] = $jsonResult['AddressList'][0]['Y'];
                $json['long'] = $jsonResult['AddressList'][0]['X'];
            }
        }
    }
    if (!empty($json['lat'])) {
        fputcsv($weekly[$key]['fh'], array(
            $json['service_request_id'],
            date('Y-m-d H:i:s', $requestTime),
            $json['area'],
            $json['service_name'],
            $json['subproject'],
            $json['description'],
            $json['address_string'],
            $json['lat'],
            $json['long'],
        ));
    }
}

$listJson = array();
krsort($weekly);
foreach ($weekly AS $week) {
    unset($week['fh']);
    $week['begin'] = date('Y-m-d', $week['begin']);
    $week['end'] = date('Y-m-d', $week['end']);
    $listJson[] = $week;
}
file_put_contents(__DIR__ . '/data/list.json', json_encode($listJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
