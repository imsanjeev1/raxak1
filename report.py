import sys, ast
import redis
import os
import loadrules  # to load the mapping between profiles and rules
import cloudraxak
import platform
import re
def generateReportPDF(parameter_dict):
    usernameIP = parameter_dict['usernameIP']
    profilename = parameter_dict['profilename']
    archieveLogTimestamp = parameter_dict['archieveLogTimestamp']
    archieveLogTimestampGmt = parameter_dict['archieveLogTimestampGmt']
    archieveLogFirst = parameter_dict['archieveLogFirst']
    userid = parameter_dict['userid']
    nickname = parameter_dict['getnickname']
    userIpDetails = eval(cloudraxak.getIPDetails(usernameIP))
    hostname = userIpDetails['hostname']
    os = userIpDetails['os'] + ' Release ' + userIpDetails['os_version']
    osName = userIpDetails['os'].lower()
    codeversion = ''
    if(usernameIP == nickname):
        servernames = usernameIP
    else:
        servernames = nickname+' '+'('+usernameIP+')'
    RuleSetList = cloudraxak.defaultdict(dict)
    latestTimestampProfile = ''
    latestTimestampExeMode = ''
    if (archieveLogFirst == 'true'):
        array_log = []
        [array_log.append(x) for x in cloudraxak.showrun(userid, usernameIP, '')]
        latestTimestampRuleSetList = array_log
    else:
        latestTimestampRuleSetList = [x.encode('ascii') for x in cloudraxak.showrun(userid, usernameIP, archieveLogTimestamp)]
    manual_low_severity_count = []
    manual_medium_severity_count = []
    manual_high_severity_count = []
    failed_low_severity_count = []
    failed_medium_severity_count = []
    failed_high_severity_count = []
    success_low_severity_count = []
    success_medium_severity_count = []
    success_high_severity_count = []
    get_low_severity = []
    get_medium_severity = []
    get_high_severity = []
    servityExists = True
    get_rule_name = ''
    get_severity_list = []
    for report in latestTimestampRuleSetList:
        reportDic = ''
        reportDic = ast.literal_eval(report)  # str to dictionay conversion
        if ('manual' in reportDic['outcome']):
            RuleSetList['manual'][reportDic['rule']] = reportDic
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            if "low" in get_severity:
                manual_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                manual_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                manual_high_severity_count.append(get_severity)
            
        elif ('failed' in reportDic['outcome']):
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            RuleSetList['failed'][reportDic['rule']] = reportDic
            if 'low' in get_severity:
                failed_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                failed_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                failed_high_severity_count.append(get_severity)
        elif ('successful' in reportDic['outcome']):
            RuleSetList['successful'][reportDic['rule']] = reportDic
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            if 'low' in get_severity:
                success_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                success_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                success_high_severity_count.append(get_severity)
        else:
            RuleSetList['unknown'][reportDic['rule']] = reportDic
        latestTimestampProfile = reportDic['profile']
        report_status = reportDic['status']

        if 'ABORTED' in report_status:
            report_check_status = '('+report_status+')'
        else:
            report_check_status = ''
        latestTimestampExeMode = reportDic['exemode']
        if codeversion == '':
            if reportDic.has_key('codeversion'):
                codeversion = (reportDic['codeversion'].strip()).title()
            else:
                codeversion = previouscodeversion
    if get_rule_name != '':
        manual_low_severity = len(manual_low_severity_count)
        manual_medium_severity = len(manual_medium_severity_count)
        manual_high_severity = len(manual_high_severity_count)
        failed_low_severity = len(failed_low_severity_count)
        failed_medium_severity = len(failed_medium_severity_count)
        failed_high_severity = len(failed_high_severity_count)
        success_low_severity = len(success_low_severity_count)
        success_medium_severity = len(success_medium_severity_count)
        success_high_severity = len(success_high_severity_count)
        manual_total_val = manual_low_severity + manual_medium_severity + manual_high_severity
        failed_total_val = failed_low_severity + failed_medium_severity + failed_high_severity
        success_total_val = success_low_severity + success_medium_severity + success_high_severity
        high_severity_total = manual_high_severity + failed_high_severity + success_high_severity
        medium_severity_total = manual_medium_severity + failed_medium_severity + success_medium_severity
        low_severity_total = manual_low_severity + failed_low_severity + success_low_severity
        success_severity_total_float = float(success_total_val)
        total_results = high_severity_total + medium_severity_total + low_severity_total
        success_severity_total_percentage = (success_severity_total_float / total_results * 100)
        get_success_severity_percentage = str(success_severity_total_percentage)[:9]
        success_severity_percentage = cloudraxak.check_decimal(get_success_severity_percentage)
        failed_severity_total_float = float(failed_total_val)
        failed_severity_total_percentage = (failed_severity_total_float / total_results * 100)
        get_failed_severity_percentage = str(failed_severity_total_percentage)[:9]
        failed_severity_percentage = cloudraxak.check_decimal(get_failed_severity_percentage)
        manual_severity_total_float = float(manual_total_val)
        manual_severity_total_percentage = (manual_severity_total_float / total_results * 100)
        get_manual_severity_percentage = str(manual_severity_total_percentage)[:9]
        manual_severity_percentage = cloudraxak.check_decimal(get_manual_severity_percentage)
        float_array = []
        success_after_decimal = cloudraxak.code_decm(get_success_severity_percentage)
        failed_after_decimal = cloudraxak.code_decm(get_failed_severity_percentage)
        manual_after_decimal = cloudraxak.code_decm(get_manual_severity_percentage)
        if(get_success_severity_percentage=='100.0'):
            success_after_decimal = '0'
        if(get_failed_severity_percentage=='100.0'):
            failed_after_decimal ='0'
        if(get_manual_severity_percentage=='100.0'):
            manual_after_decimal = '0'
        float_array.append(success_after_decimal)
        float_array.append(failed_after_decimal)
        float_array.append(manual_after_decimal)
        get_max_list = max(float_array)
        get_success_severity_percentage_actual = ''
        get_manual_severity_percentage_actual = ''
        get_failed_severity_percentage_actual = ''
        if int(float_array[0][0]) >= 5 or get_max_list == float_array[0]:
            if(get_success_severity_percentage == '100.0' or get_success_severity_percentage =='0.0'):
                get_success_severity_percentage_add = get_success_severity_percentage
            else:
                get_success_severity_percentage_add = float(get_success_severity_percentage) + 1
            get_success_severity_percentage_actual = str(get_success_severity_percentage_add)
            get_success_actual_value = get_success_severity_percentage_actual[:get_success_severity_percentage_actual.find('.')]
        else:
            get_success_severity_percentage_add = float(get_success_severity_percentage)
            get_success_severity_percentage_actual = str(get_success_severity_percentage_add)
            get_success_actual_value = get_success_severity_percentage_actual[
                                       :get_success_severity_percentage_actual.find('.')]

        if int(float_array[1][0]) >= 5 or get_max_list == float_array[1]:
            if(get_failed_severity_percentage =="0.0" or get_failed_severity_percentage =="100.0"):
                get_failed_severity_percentage_add = get_failed_severity_percentage
            else:
                get_failed_severity_percentage_add = float(get_failed_severity_percentage) + 1
                get_failed_severity_percentage_actual = str(get_failed_severity_percentage_add)
                get_failed_actual_value = get_failed_severity_percentage_actual[
                                      :get_failed_severity_percentage_actual.find('.')]
        else:
            get_failed_severity_percentage_add = float(get_failed_severity_percentage)
            get_failed_severity_percentage_actual = str(get_failed_severity_percentage_add)
            get_failed_actual_value = get_failed_severity_percentage_actual[
                                      :get_failed_severity_percentage_actual.find('.')]
        if int(float_array[2][0]) >= 5 or get_max_list == float_array[2]:
            if(get_manual_severity_percentage =="0.0" or get_manual_severity_percentage == "100.0"):
                get_manual_severity_percentage_add = get_manual_severity_percentage
            else:
                get_manual_severity_percentage_add = float(get_manual_severity_percentage) + 1
            get_manual_severity_percentage_actual = str(get_manual_severity_percentage_add)
            get_manual_actual_value = get_manual_severity_percentage_actual[
                                      :get_manual_severity_percentage_actual.find('.')]
        else:
            get_manual_severity_percentage_add = float(get_manual_severity_percentage)
            get_manual_severity_percentage_actual = str(get_manual_severity_percentage_add)
            get_manual_actual_value = get_manual_severity_percentage_actual[
                                      :get_manual_severity_percentage_actual.find('.')]
    if (latestTimestampExeMode == '0'):
        latestTimestampExeMode = 'Manual Remediation'
    else:
        latestTimestampExeMode = 'Automatic Remediation'
    ruleProfileList = cloudraxak.ruleTitleOnly(profilename, osName)
    gethostname = str(platform.uname()[1]) + "<br/>" + str(platform.dist()[0]) + " " + str(platform.dist()[1])

    if(archieveLogTimestampGmt == 'Latest Execution'):
        report_check_status = '&nbsp;(<span style="color:orange;">InProgress</span>)'
    else:
        report_check_status
    not_applicable_length = []
    if manual_total_val > 0:
        for rule in sorted(RuleSetList['manual'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = cloudraxak.getDisaOsName(osName)
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            rule_console_list = re.split('\n',rule['console'].replace("=================================================",''))
            rule_console = ''
            for row in rule_console_list:
                if row:
                    # rule_console = rule_console+row+"<br/>"
                    rule_console = rule_console + row + '\n'
                    if 'N/A' in rule_console:
                        not_applicable_length.append(rule_console)
                    #   manual_rule_line = 'This rule is not applicable.'
            rule_cons = rule_console.replace('\n', '</p>')
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            manual_remediation = {'rule':rule_id,'severity':severity,'console':rule_console,'title':rule_title,'status':rule_status,'rulefix':rule_fix,'os':os}
    else:
        manual_remediation = ''
    if failed_total_val > 0:
        for rule in sorted(RuleSetList['failed'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = cloudraxak.getDisaOsName(osName)
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            rule_console_list = re.split('\n',rule['console'].replace("=================================================",''))
            for row in rule_console_list:
                if row:
                    rule_console = rule_console + row + "\n"
                    if 'N/A' in rule_console:
                        failed_rule_line = 'This rule is not applicable.'
            rule_cons = rule_console.replace("\n", "</p>")
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            failed_remediation = {'rule':rule_id,'severity':severity,'console':rule_console,'title':rule_title,'status':rule_status,'rulefix':rule_fix,'os':os}
    else:
      failed_remediation = ''
    if success_total_val > 0:
        for rule in sorted(RuleSetList['successful'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = cloudraxak.getDisaOsName(osName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            rule_console_list = re.split('\n',rule['console'].replace("=================================================",''))
            for row in rule_console_list:
                if row:
                    rule_console = rule_console + row + "\n"
            rule_cons = str(rule_console).replace('\n', '</p><p>')
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            success_remediation = {'rule':rule_id,'severity':severity,'console':rule_console,'title':rule_title,'status':rule_status}
    else:
        success_remediation = ''
    if len(not_applicable_length) > 0:
        for rule in sorted(RuleSetList['manual'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = cloudraxak.getDisaOsName(osName)
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            rule_console_list = re.split('\n',rule['console'].replace("=================================================",''))
            for row in rule_console_list:
                if row:
                    # rule_console = rule_console+row+"<br/>"
                    rule_console = rule_console + row + '\n'
                    if 'N/A' in rule_console:
                        manual_rule_line = 'This rule is not applicable.'
                        rule_cons = rule_console.replace('\n', '</p>')
                        rule_status = rule['status']
                        rule_title = ruleProfileList[rule['rule']]
                        not_applicable = {'rule':rule_id,'severity':severity,'title':rule_title}
    else:
        not_applicable = ''
    cron_list = cloudraxak.getCronJobs(userid)
    for cron in cron_list:
        cron_dict = ast.literal_eval(cron)

    osInfo = {'servernames':servernames,'hostname':hostname,'os':os,'profile':latestTimestampProfile,'executed':archieveLogTimestampGmt,'version':codeversion,'status':report_check_status,'mode':latestTimestampExeMode}
    summary_details = {'passed':{'high':success_high_severity,'low':success_low_severity,'medium':success_medium_severity,'total':success_total_val,'percentage':get_success_actual_value},'failed':{'high':failed_high_severity,'low':failed_low_severity,'medium':failed_medium_severity,'total':failed_total_val,'percentage':get_failed_actual_value},'manual':{'high':manual_high_severity,'low':manual_low_severity,'medium':manual_medium_severity,'total':manual_total_val,'percentage':get_manual_actual_value},
'total':{'high':high_severity_total,'medium':medium_severity_total,'low':low_severity_total,'totalresult':total_results}}
    ruleInfo = {'manual':manual_remediation,'failed':failed_remediation,'success':success_remediation,'notapplicable':not_applicable,'cron':cron_dict}
    lastexecutionlog= lastExecution(userid,usernameIP)
    report_info = {'osinfo':osInfo,'severity':summary_details,'rulesInfo':ruleInfo,'lastExecution':lastexecutionlog}
    return report_info

def lastExecution(userid,usernameIP):
    archiveLogFileNameList = cloudraxak.display_execution_time_list(userid, usernameIP);
    archiveLogFileNameListHtml = [];
    i = 0;
    for archiveLogFileName in archiveLogFileNameList:
        i = i + 1
        if (i == 11):
            break
        archiveLogFileNameListHtml.append(archiveLogFileName)
        archeivelog = archiveLogFileNameListHtml
    return archiveLogFileNameListHtml
    
